"use server";

import { revalidatePath } from "next/cache";
import { generateRecipeBarcode } from "@/lib/barcode";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { smartMatches } from "@/lib/smart-search";
import { recipeSchema } from "@/lib/validations";
import { calculateAllYields } from "@/lib/yield";
import { RecipeType, Unit } from "@prisma/client";

function parseRecipeFormData(raw: Record<string, FormDataEntryValue>) {
  const ingredientCount = parseInt(String(raw.ingredientCount || "0"), 10);
  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    ingredients.push({
      ingredientId: String(raw[`ingredient_${i}_ingredientId`] || ""),
      quantityRequired: raw[`ingredient_${i}_quantityRequired`],
      unit: raw[`ingredient_${i}_unit`],
    });
  }

  const recipeType = raw.recipeType === "RETAIL" ? "RETAIL" : "PREPARED";
  const requiresKitchen =
    raw.requiresKitchen === "true" || raw.requiresKitchen === "on"
      ? true
      : recipeType === "RETAIL"
        ? false
        : true;

  return recipeSchema.safeParse({
    name: raw.name,
    description: raw.description,
    category: raw.category,
    yieldQuantity: raw.yieldQuantity,
    yieldUnit: raw.yieldUnit,
    instructions: raw.instructions,
    recipeType,
    requiresKitchen: recipeType === "RETAIL" ? requiresKitchen : requiresKitchen,
    retailInventoryItemId: String(raw.retailInventoryItemId || "").trim() || undefined,
    retailQuantityPerSale: raw.retailQuantityPerSale,
    ingredients,
  });
}

const recipeStockInclude = {
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

export async function getRecipes(search?: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
    include: recipeStockInclude,
    orderBy: { updatedAt: "desc" },
  });

  const yields = calculateAllYields(recipes);
  const rows = recipes.map((recipe) => ({
    ...recipe,
    yieldResult: yields.find((y) => y.recipeId === recipe.id)!,
  }));

  if (!search?.trim()) {
    return serializeForClient(rows);
  }

  return serializeForClient(
    rows.filter((recipe) =>
      smartMatches(
        [
          recipe.name,
          recipe.category,
          recipe.description,
          recipe.barcode,
          recipe.recipeType,
          recipe.requiresKitchen ? "kitchen" : "no kitchen",
        ],
        search
      )
    )
  );
}

export async function getRecipe(id: string) {
  const recipe = await db.recipe.findUnique({
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

  return recipe ? serializeForClient(recipe) : null;
}

export async function getActiveIngredientsForRecipes() {
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

export async function createRecipe(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = parseRecipeFormData(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  if (data.recipeType === "RETAIL" && data.retailInventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.retailInventoryItemId, businessId, isActive: true },
    });
    if (!item) {
      return { error: { retailInventoryItemId: ["Inventory item not found"] } };
    }
  }

  await db.recipe.create({
    data: {
      businessId,
      name: data.name,
      description: data.description || null,
      category: data.category,
      yieldQuantity: data.yieldQuantity,
      yieldUnit: data.yieldUnit,
      instructions: data.instructions || null,
      barcode: generateRecipeBarcode(data.name),
      recipeType: data.recipeType as RecipeType,
      requiresKitchen: data.requiresKitchen,
      retailInventoryItemId:
        data.recipeType === "RETAIL" ? data.retailInventoryItemId ?? null : null,
      retailQuantityPerSale:
        data.recipeType === "RETAIL" ? data.retailQuantityPerSale ?? null : null,
      ingredients:
        data.recipeType === "PREPARED"
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

  revalidatePath("/recipes");
  revalidatePath("/orders/pos");
  revalidatePath("/");
  revalidatePath("/yield");
  return { success: true };
}

export async function updateRecipe(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = parseRecipeFormData(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  if (data.recipeType === "RETAIL" && data.retailInventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.retailInventoryItemId, businessId, isActive: true },
    });
    if (!item) {
      return { error: { retailInventoryItemId: ["Inventory item not found"] } };
    }
  }

  await db.$transaction([
    db.recipeIngredient.deleteMany({ where: { recipeId: id } }),
    db.recipe.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
        instructions: data.instructions || null,
        recipeType: data.recipeType as RecipeType,
        requiresKitchen: data.requiresKitchen,
        retailInventoryItemId:
          data.recipeType === "RETAIL" ? data.retailInventoryItemId ?? null : null,
        retailQuantityPerSale:
          data.recipeType === "RETAIL" ? data.retailQuantityPerSale ?? null : null,
        ingredients:
          data.recipeType === "PREPARED"
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

  revalidatePath("/recipes");
  revalidatePath("/orders/pos");
  revalidatePath("/");
  revalidatePath("/yield");
  return { success: true };
}

export async function deleteRecipe(id: string) {
  const recipe = await db.recipe.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!recipe) {
    return { error: "Recipe not found" };
  }

  const activeOrders = await db.orderLineItem.count({
    where: {
      recipeId: id,
      order: {
        status: {
          in: ["NEW", "PROCESSING", "PACKING", "READY"],
        },
      },
    },
  });

  if (activeOrders > 0) {
    return {
      error: `Cannot delete "${recipe.name}": it is on ${activeOrders} open order line(s). Complete or cancel those orders first.`,
    };
  }

  try {
    await db.recipe.delete({ where: { id } });
  } catch {
    return { error: `Could not delete "${recipe.name}". Try again or contact support.` };
  }

  revalidatePath("/recipes");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/orders");
  revalidatePath("/recipes/pricing");
  return { success: true };
}

/** Resolve a recipe from a scanned barcode (prefix 2). */
export async function getRecipeByBarcode(barcode: string) {
  const normalized = barcode.replace(/\D/g, "");
  if (normalized.length < 8) return null;

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const recipe = await db.recipe.findFirst({
    where: {
      businessId,
      OR: [{ barcode: normalized }, { barcode: normalized.slice(0, 13) }],
    },
    select: {
      id: true,
      name: true,
      salePrice: true,
      barcode: true,
      category: true,
      yieldUnit: true,
      imageUrl: true,
      recipeType: true,
    },
  });

  return recipe ? serializeForClient(recipe) : null;
}

export async function getYieldResults() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
    include: recipeStockInclude,
  });

  return calculateAllYields(recipes);
}
