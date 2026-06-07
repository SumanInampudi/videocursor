"use server";

import { revalidatePath } from "next/cache";
import { resolveCategory } from "@/lib/category-resolve";
import { generateProductBarcode } from "@/lib/barcode";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { smartMatches } from "@/lib/smart-search";
import { productSchema } from "@/lib/validations";
import { enrichYieldsWithCommitments } from "@/lib/order-stock-commitments";
import { getCommittedProductQuantities } from "@/lib/order-stock-server";
import { posAvailabilityFromMaxYield } from "@/lib/pos-stock-status";
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

  const inclusionCount = parseInt(String(raw.inclusionCount || "0"), 10);
  const inclusions = [];
  for (let i = 0; i < inclusionCount; i++) {
    inclusions.push({
      includedProductId: String(raw[`inclusion_${i}_includedProductId`] || ""),
      quantityPerParent: raw[`inclusion_${i}_quantityPerParent`],
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
    posCode: raw.posCode,
    instructions: raw.instructions,
    productType,
    requiresKitchen: productType === "RETAIL" ? requiresKitchen : requiresKitchen,
    retailInventoryItemId: String(raw.retailInventoryItemId || "").trim() || undefined,
    retailQuantityPerSale: raw.retailQuantityPerSale,
    ingredients,
    inclusions,
  });
}

async function assertPosCodeAvailable(
  businessId: string,
  posCode: number | null | undefined,
  excludeProductId?: string
): Promise<{ error: { posCode: string[] } } | null> {
  if (posCode == null) return null;
  const existing = await db.product.findFirst({
    where: {
      businessId,
      posCode,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { name: true },
  });
  if (existing) {
    return {
      error: { posCode: [`POS code ${posCode} is already used by "${existing.name}"`] },
    };
  }
  return null;
}

export async function getSuggestedPosCode() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const agg = await db.product.aggregate({
    where: { businessId, posCode: { not: null } },
    _max: { posCode: true },
  });
  return (agg._max.posCode ?? 0) + 1;
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
    where: { businessId, productType: { not: ProductType.PREP } },
    include: productStockInclude,
    orderBy: { updatedAt: "desc" },
  });

  const { getCommittedProductQuantities } = await import("@/lib/order-stock-server");
  const committed = await getCommittedProductQuantities(businessId);
  const yields = enrichYieldsWithCommitments(
    calculateAllYields(products as never[]),
    committed
  );
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
      includedSides: {
        include: {
          includedProduct: { select: { id: true, name: true, category: true } },
        },
        orderBy: { includedProduct: { name: "asc" } },
      },
      retailInventoryItem: {
        select: { id: true, name: true, unit: true, sku: true },
      },
    },
  });

  return product ? serializeForClient(product) : null;
}

export async function getPreparedProductsForInclusions(excludeProductId?: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const rows = await db.product.findMany({
    where: {
      businessId,
      productType: ProductType.PREPARED,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { id: true, name: true, category: true, salePrice: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return serializeForClient(
    rows.map((row) => ({
      ...row,
      salePrice: row.salePrice != null ? Number(row.salePrice) : null,
    }))
  );
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

export async function getProductCategories() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const products = await db.product.findMany({
    where: { businessId },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return products.map((product) => product.category);
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

  const existingCategories = await getProductCategories();
  const categoryResult = resolveCategory(data.category, existingCategories);
  if (!categoryResult.ok) {
    return { error: { category: [categoryResult.message] } };
  }
  data.category = categoryResult.category;

  if (data.productType === "RETAIL" && data.retailInventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.retailInventoryItemId, businessId, isActive: true },
    });
    if (!item) {
      return { error: { retailInventoryItemId: ["Inventory item not found"] } };
    }
  }

  if (data.productType === "PREPARED" && data.inclusions.length > 0) {
    const inclusionIds = data.inclusions.map((row) => row.includedProductId);
    const found = await db.product.count({
      where: { businessId, id: { in: inclusionIds }, productType: ProductType.PREPARED },
    });
    if (found !== inclusionIds.length) {
      return { error: { inclusions: ["One or more included products were not found"] } };
    }
  }

  const posCodeConflict = await assertPosCodeAvailable(businessId, data.posCode);
  if (posCodeConflict) return posCodeConflict;

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
      posCode: data.posCode,
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
      includedSides:
        data.productType === "PREPARED" && data.inclusions.length > 0
          ? {
              create: data.inclusions.map((row) => ({
                includedProductId: row.includedProductId,
                quantityPerParent: row.quantityPerParent,
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

  const existingCategories = await getProductCategories();
  const categoryResult = resolveCategory(data.category, existingCategories);
  if (!categoryResult.ok) {
    return { error: { category: [categoryResult.message] } };
  }
  data.category = categoryResult.category;

  if (data.productType === "RETAIL" && data.retailInventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.retailInventoryItemId, businessId, isActive: true },
    });
    if (!item) {
      return { error: { retailInventoryItemId: ["Inventory item not found"] } };
    }
  }

  if (data.productType === "PREPARED" && data.inclusions.length > 0) {
    const inclusionIds = data.inclusions.map((row) => row.includedProductId);
    if (inclusionIds.includes(id)) {
      return { error: { inclusions: ["A product cannot include itself"] } };
    }
    const found = await db.product.count({
      where: { businessId, id: { in: inclusionIds }, productType: ProductType.PREPARED },
    });
    if (found !== inclusionIds.length) {
      return { error: { inclusions: ["One or more included products were not found"] } };
    }
  }

  const posCodeConflict = await assertPosCodeAvailable(businessId, data.posCode, id);
  if (posCodeConflict) return posCodeConflict;

  await db.$transaction([
    db.productIngredient.deleteMany({ where: { productId: id } }),
    db.productInclusion.deleteMany({ where: { parentProductId: id } }),
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
        posCode: data.posCode,
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
        includedSides:
          data.productType === "PREPARED" && data.inclusions.length > 0
            ? {
                create: data.inclusions.map((row) => ({
                  includedProductId: row.includedProductId,
                  quantityPerParent: row.quantityPerParent,
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
  const [products, committed] = await Promise.all([
    db.product.findMany({
      where: { businessId, productType: { not: ProductType.PREP } },
      include: productStockInclude,
    }),
    getCommittedProductQuantities(businessId),
  ]);

  return enrichYieldsWithCommitments(
    calculateAllYields(products as never[]),
    committed
  ).sort((a, b) => (b.availableYield ?? b.maxYield) - (a.availableYield ?? a.maxYield));
}

export async function getProductAvailabilityMap() {
  const yields = await getYieldResults();

  return Object.fromEntries(
    yields.map((y) => [
      y.productId,
      posAvailabilityFromMaxYield(
        y.availableYield ?? y.maxYield,
        y.canSell ?? y.canMake
      ),
    ])
  );
}
