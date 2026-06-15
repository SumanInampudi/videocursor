"use server";

import { revalidatePath } from "next/cache";
import { resolveCategory } from "@/lib/category-resolve";
import { generateProductBarcode } from "@/lib/barcode";
import { db } from "@/lib/db";
import { applyFifoConsumptions, ensureCostLayers, receiveCostLayers } from "@/lib/inventory-fifo";
import { planPrepBatchProduction } from "@/lib/prep-batch";
import { createPrepOutputStock } from "@/lib/prep-output";
import { serializeForClient } from "@/lib/serialize";
import { productSchema } from "@/lib/validations";
import { ProductType, Unit } from "@prisma/client";
import { resolveBomUnitsFromCatalog } from "@/lib/ingredient-unit";
import { productIngredientsWithFifoStock } from "@/lib/inventory-stock-query";

const PREP_PATHS = ["/prep", "/prep/produce", "/products", "/inventory", "/yield", "/orders/pos"];

function revalidatePrep() {
  for (const p of PREP_PATHS) revalidatePath(p);
}

function parsePrepFormData(raw: Record<string, FormDataEntryValue>) {
  const ingredientCount = parseInt(String(raw.ingredientCount || "0"), 10);
  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    ingredients.push({
      ingredientId: String(raw[`ingredient_${i}_ingredientId`] || ""),
      quantityRequired: raw[`ingredient_${i}_quantityRequired`],
      unit: raw[`ingredient_${i}_unit`],
    });
  }

  return productSchema.safeParse({
    name: raw.name,
    description: raw.description,
    category: raw.category,
    yieldQuantity: raw.yieldQuantity,
    yieldUnit: raw.yieldUnit,
    salePrice: null,
    prepTimeMinutes: null,
    posCode: null,
    instructions: raw.instructions,
    productType: "PREP",
    requiresKitchen: false,
    inclusionOutputQuantity: raw.inclusionOutputQuantity,
    ingredients,
    inclusions: [],
  });
}

export async function getPrepItems() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const items = await db.product.findMany({
    where: { businessId, productType: ProductType.PREP },
    include: {
      ingredients: {
        include: { ingredient: { select: { id: true, name: true } } },
      },
      prepOutputInventoryItem: {
        select: { id: true, quantity: true, unit: true, costPerUnit: true },
      },
      _count: { select: { prepBatches: true } },
    },
    orderBy: { name: "asc" },
  });

  return serializeForClient(items);
}

export async function getPrepItem(id: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const item = await db.product.findFirst({
    where: { id, businessId, productType: ProductType.PREP },
    include: {
      ingredients: {
        include: {
          ingredient: { select: { id: true, name: true, defaultUnit: true } },
        },
      },
      prepOutputInventoryItem: {
        select: { id: true, name: true, quantity: true, unit: true },
      },
    },
  });

  return item ? serializeForClient(item) : null;
}

export async function getPrepItemsForProduce() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const items = await db.product.findMany({
    where: { businessId, productType: ProductType.PREP },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: {
              inventoryItems: {
                where: { isActive: true },
                include: {
                  costLayers: {
                    where: { quantityRemaining: { gt: 0 } },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      prepOutputInventoryItem: {
        select: { id: true, quantity: true, unit: true, costPerUnit: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return serializeForClient(items);
}

export async function getPrepOutputIngredientsForBom() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const preps = await db.product.findMany({
    where: { businessId, productType: ProductType.PREP, prepOutputInventoryItemId: { not: null } },
    select: {
      id: true,
      name: true,
      category: true,
      yieldUnit: true,
      prepOutputInventoryItem: {
        select: {
          ingredientId: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              defaultUnit: true,
              isActive: true,
              aliases: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return serializeForClient(
    preps
      .map((p) => p.prepOutputInventoryItem?.ingredient)
      .filter((ing): ing is NonNullable<typeof ing> => ing != null && ing.isActive)
  );
}

export async function getRecentPrepBatches(limit = 20) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const inventoryIds = await db.inventoryItem.findMany({
    where: { businessId },
    select: { id: true },
  });

  const rows = await db.prepBatch.findMany({
    where: {
      businessId,
      outputInventoryItemId: { in: inventoryIds.map((item) => item.id) },
    },
    include: {
      prepProduct: { select: { name: true, yieldUnit: true } },
    },
    orderBy: { producedAt: "desc" },
    take: limit,
  });

  return serializeForClient(rows);
}

export async function createPrepItem(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = parsePrepFormData(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const existingCategories = await import("@/app/actions/products").then((m) =>
    m.getProductCategories()
  );
  const categoryResult = resolveCategory(data.category, await existingCategories);
  if (!categoryResult.ok) {
    return { error: { category: [categoryResult.message] } };
  }
  data.category = categoryResult.category;

  if (data.ingredients.length > 0) {
    const resolved = await resolveBomUnitsFromCatalog(businessId, data.ingredients);
    if ("error" in resolved) return { error: { ingredients: [resolved.error] } };
    data.ingredients = data.ingredients.map((ing, index) => ({
      ...ing,
      unit: resolved[index].unit,
    }));
  }

  await db.$transaction(async (tx) => {
    const outputInventoryItemId = await createPrepOutputStock(tx, businessId, {
      name: data.name,
      category: data.category,
      yieldUnit: data.yieldUnit,
    });

    await tx.product.create({
      data: {
        businessId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
        inclusionOutputQuantity: data.inclusionOutputQuantity ?? null,
        instructions: data.instructions || null,
        barcode: generateProductBarcode(data.name),
        productType: ProductType.PREP,
        requiresKitchen: false,
        prepOutputInventoryItemId: outputInventoryItemId,
        ingredients: {
          create: data.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: ing.quantityRequired,
            unit: ing.unit as Unit,
          })),
        },
      },
    });
  });

  revalidatePrep();
  return { success: true };
}

export async function updatePrepItem(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = parsePrepFormData(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const existing = await db.product.findFirst({
    where: { id, businessId, productType: ProductType.PREP },
  });
  if (!existing) return { error: { name: ["Prep item not found"] } };

  const existingCategories = await import("@/app/actions/products").then((m) =>
    m.getProductCategories()
  );
  const categoryResult = resolveCategory(data.category, await existingCategories);
  if (!categoryResult.ok) {
    return { error: { category: [categoryResult.message] } };
  }
  data.category = categoryResult.category;

  if (data.ingredients.length > 0) {
    const resolved = await resolveBomUnitsFromCatalog(businessId, data.ingredients);
    if ("error" in resolved) return { error: { ingredients: [resolved.error] } };
    data.ingredients = data.ingredients.map((ing, index) => ({
      ...ing,
      unit: resolved[index].unit,
    }));
  }

  await db.$transaction(async (tx) => {
    await tx.productIngredient.deleteMany({ where: { productId: id } });
    await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
        inclusionOutputQuantity: data.inclusionOutputQuantity ?? null,
        instructions: data.instructions || null,
        ingredients: {
          create: data.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: ing.quantityRequired,
            unit: ing.unit as Unit,
          })),
        },
      },
    });
  });

  revalidatePrep();
  return { success: true };
}

export async function producePrepBatch(input: {
  prepProductId: string;
  outputQuantity: number;
  note?: string;
}) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const prep = await db.product.findFirst({
    where: { id: input.prepProductId, businessId, productType: ProductType.PREP },
    include: {
      ingredients: productIngredientsWithFifoStock.ingredients,
      prepOutputInventoryItem: true,
    },
  });

  if (!prep) return { error: "Prep item not found" };

  const plan = planPrepBatchProduction(
    {
      id: prep.id,
      name: prep.name,
      yieldQuantity: prep.yieldQuantity,
      prepOutputInventoryItemId: prep.prepOutputInventoryItemId,
      ingredients: prep.ingredients as never,
      prepOutputInventoryItem: prep.prepOutputInventoryItem,
    },
    input.outputQuantity
  );

  if (!plan.ok) return { error: plan.error };

  const outputItem = prep.prepOutputInventoryItem;
  if (!outputItem) return { error: "Prep output stock not configured" };

  await db.$transaction(async (tx) => {
    for (const consumption of plan.consumptions) {
      await ensureCostLayers(tx, consumption.inventoryItemId);
    }
    await applyFifoConsumptions(tx, plan.consumptions);

    const previousQty = Number(outputItem.quantity);
    const previousCost = Number(outputItem.costPerUnit);
    const receive = await receiveCostLayers(tx, {
      inventoryItemId: outputItem.id,
      previousQty,
      receiveQty: input.outputQuantity,
      unit: outputItem.unit,
      previousCost,
      receiveCost: plan.costPerUnit,
    });

    const newQty = previousQty + input.outputQuantity;
    await tx.inventoryItem.update({
      where: { id: outputItem.id },
      data: {
        quantity: newQty,
        costPerUnit: receive.costPerUnit,
      },
    });

    await tx.prepBatch.create({
      data: {
        businessId,
        prepProductId: prep.id,
        outputInventoryItemId: outputItem.id,
        quantityProduced: input.outputQuantity,
        totalInputCost: plan.totalInputCost,
        costPerUnit: plan.costPerUnit,
        note: input.note?.trim() || null,
      },
    });
  });

  revalidatePrep();
  return {
    success: true,
    quantityProduced: input.outputQuantity,
    totalInputCost: plan.totalInputCost,
    costPerUnit: plan.costPerUnit,
  };
}
