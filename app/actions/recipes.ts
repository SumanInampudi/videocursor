"use server";

import { revalidatePath } from "next/cache";
import { generateRecipeBarcode } from "@/lib/barcode";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { recipeSchema } from "@/lib/validations";
import { calculateAllYields } from "@/lib/yield";
import { Unit } from "@prisma/client";

export async function getRecipes() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
    include: {
      ingredients: {
        include: { ingredient: { include: { inventoryItems: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const yields = calculateAllYields(recipes);

  return serializeForClient(
    recipes.map((recipe) => ({
      ...recipe,
      yieldResult: yields.find((y) => y.recipeId === recipe.id)!,
    }))
  );
}

export async function getRecipe(id: string) {
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: { ingredient: true },
      },
    },
  });

  return recipe ? serializeForClient(recipe) : null;
}

export async function getActiveIngredientsForRecipes() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  return db.ingredient.findMany({
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
}

export async function createRecipe(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const ingredientCount = parseInt(String(raw.ingredientCount || "0"), 10);

  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    ingredients.push({
      ingredientId: String(raw[`ingredient_${i}_ingredientId`] || ""),
      quantityRequired: raw[`ingredient_${i}_quantityRequired`],
      unit: raw[`ingredient_${i}_unit`],
    });
  }

  const parsed = recipeSchema.safeParse({
    name: raw.name,
    description: raw.description,
    category: raw.category,
    yieldQuantity: raw.yieldQuantity,
    yieldUnit: raw.yieldUnit,
    instructions: raw.instructions,
    ingredients,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
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
      ingredients: {
        create: data.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantityRequired: ing.quantityRequired,
          unit: ing.unit as Unit,
        })),
      },
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
  const ingredientCount = parseInt(String(raw.ingredientCount || "0"), 10);

  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    ingredients.push({
      ingredientId: String(raw[`ingredient_${i}_ingredientId`] || ""),
      quantityRequired: raw[`ingredient_${i}_quantityRequired`],
      unit: raw[`ingredient_${i}_unit`],
    });
  }

  const parsed = recipeSchema.safeParse({
    name: raw.name,
    description: raw.description,
    category: raw.category,
    yieldQuantity: raw.yieldQuantity,
    yieldUnit: raw.yieldUnit,
    instructions: raw.instructions,
    ingredients,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

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
        ingredients: {
        create: data.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantityRequired: ing.quantityRequired,
          unit: ing.unit as Unit,
        })),
        },
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
      order: { status: { in: ["NEW", "PROCESSING", "READY"] } },
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
    },
  });

  return recipe ? serializeForClient(recipe) : null;
}

export async function getYieldResults() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
    include: {
      ingredients: {
        include: { ingredient: { include: { inventoryItems: true } } },
      },
    },
  });

  return calculateAllYields(recipes);
}
