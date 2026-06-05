"use server";

import { revalidatePath } from "next/cache";
import { generateProductBarcode } from "@/lib/barcode";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { smartMatches } from "@/lib/smart-search";
import { productSchema } from "@/lib/validations";
import { calculateAllYields } from "@/lib/yield";
import { ProductType, Unit } from "@prisma/client";

function parseProductFormData(raw: Record<string, FormDataEntryValue>) {
  const ingredientCount = parseInt(String(raw.ingredientCount || "0"), 10);
  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    ingredients.push({
      ingredientId: String(raw[`ingredient_${i}_ingredientId`] || ""),
      quantityRequired: raw[`ingredient_${i}_quantityRequired`],
      unit: raw[`ingredient_${i}_unit`],
    });
  }

  const productType = raw.productType === "RETAIL" ? "RETAIL" : "PREPARED";
  const requiresKitchen =
    raw.requiresKitchen === "true" || raw.requiresKitchen === "on"
      ? true
      : productType === "RETAIL"
        ? false
        : true;

  return productSchema.safeParse({
    name: raw.name,
    description: raw.description,
    category: raw.category,
    yieldQuantity: raw.yieldQuantity,
    yieldUnit: raw.yieldUnit,
    salePrice: raw.salePrice,
    prepTimeMinutes: raw.prepTimeMinutes,
    instructions: raw.instructions,
    productType,
    requiresKitchen: productType === "RETAIL" ? requiresKitchen : requiresKitchen,
    retailInventoryItemId: String(raw.retailInventoryItemId || "").trim() || undefined,
    retailQuantityPerSale: raw.retailQuantityPerSale,
    ingredients,
  });
}

const productStockInclude = {
  retailInventoryItem: {
    include: {
      ingredient: { select: { wastagePercent: true } },
      costLayers: {
        where: { quantityRemaining: { gt: 0 } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
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
} as const;

export async function getProducts(search?: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const products = await db.product.findMany({
    where: { businessId },
    include: productStockInclude,
    orderBy: { updatedAt: "desc" },
  });

  const yields = calculateAllYields(products as never[]);
  const rows = products.map((product) => ({
    ...product,
    yieldResult: yields.find((y) => y.productId === product.id)!,
  }));

  if (!search?.trim()) {
    return serializeForClient(rows);
  }

  return serializeForClient(
    rows.filter((product) =>
      smartMatches(
        [
          product.name,
          product.category,
          product.description,
          product.productType,
          product.requiresKitchen ? "kitchen" : "no kitchen",
        ],
        search
      )
    )
  );
}

export async function getProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: { ingredient: true },
      },
      retailInventoryItem: {
        select: { id: true, name: true, unit: true, sku: true },
      },
    },
  });

  return product ? serializeForClient(product) : null;
}

export async function getActiveIngredientsForProducts() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const rows = await db.ingredient.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      defaultUnit: true,
      aliases: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });
  return serializeForClient(rows);
}

export async function getInventoryItemsForRetailMenu() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const rows = await db.inventoryItem.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      unit: true,
      quantity: true,
    },
    orderBy: { name: "asc" },
  });
  return serializeForClient(rows) as unknown as {
    id: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    quantity: number;
  }[];
}

export async function createProduct(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = parseProductFormData(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  if (data.productType === "RETAIL" && data.retailInventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.retailInventoryItemId, businessId, isActive: true },
    });
    if (!item) {
      return { error: { retailInventoryItemId: ["Inventory item not found"] } };
    }
  }

  await db.product.create({
    data: {
      businessId,
      name: data.name,
      description: data.description || null,
      category: data.category,
      yieldQuantity: data.yieldQuantity,
      yieldUnit: data.yieldUnit,
      salePrice: data.salePrice,
      prepTimeMinutes: data.prepTimeMinutes,
      instructions: data.instructions || null,
      barcode: generateProductBarcode(data.name),
      productType: data.productType as ProductType,
      requiresKitchen: data.requiresKitchen,
      retailInventoryItemId:
        data.productType === "RETAIL" ? data.retailInventoryItemId ?? null : null,
      retailQuantityPerSale:
        data.productType === "RETAIL" ? data.retailQuantityPerSale ?? null : null,
      ingredients:
        data.productType === "PREPARED"
          ? {
              create: data.ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantityRequired: ing.quantityRequired,
                unit: ing.unit as Unit,
              })),
            }
          : undefined,
    },
  });

  revalidatePath("/products");
  revalidatePath("/orders/pos");
  revalidatePath("/");
  revalidatePath("/yield");
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = parseProductFormData(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  if (data.productType === "RETAIL" && data.retailInventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.retailInventoryItemId, businessId, isActive: true },
    });
    if (!item) {
      return { error: { retailInventoryItemId: ["Inventory item not found"] } };
    }
  }

  await db.$transaction([
    db.productIngredient.deleteMany({ where: { productId: id } }),
    db.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
        salePrice: data.salePrice,
        prepTimeMinutes: data.prepTimeMinutes,
        instructions: data.instructions || null,
        productType: data.productType as ProductType,
        requiresKitchen: data.requiresKitchen,
        retailInventoryItemId:
          data.productType === "RETAIL" ? data.retailInventoryItemId ?? null : null,
        retailQuantityPerSale:
          data.productType === "RETAIL" ? data.retailQuantityPerSale ?? null : null,
        ingredients:
          data.productType === "PREPARED"
            ? {
                create: data.ingredients.map((ing) => ({
                  ingredientId: ing.ingredientId,
                  quantityRequired: ing.quantityRequired,
                  unit: ing.unit as Unit,
                })),
              }
            : undefined,
      },
    }),
  ]);

  revalidatePath("/products");
  revalidatePath("/orders/pos");
  revalidatePath("/");
  revalidatePath("/yield");
  return { success: true };
}

export async function deleteProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!product) {
    return { error: "Product not found" };
  }

  const activeOrders = await db.orderLineItem.count({
    where: {
      productId: id,
      order: {
        status: {
          in: ["NEW", "PROCESSING", "PACKING", "READY"],
        },
      },
    },
  });

  if (activeOrders > 0) {
    return {
      error: `Cannot delete "${product.name}": it is on ${activeOrders} open order line(s). Complete or cancel those orders first.`,
    };
  }

  try {
    await db.product.delete({ where: { id } });
  } catch {
    return { error: `Could not delete "${product.name}". Try again or contact support.` };
  }

  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/orders");
  revalidatePath("/products/pricing");
  return { success: true };
}

export async function getYieldResults() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const products = await db.product.findMany({
    where: { businessId },
    include: productStockInclude,
  });

  return calculateAllYields(products as never[]);
}
