"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recipeSchema } from "@/lib/validations";
import { calculateAllYields } from "@/lib/yield";
import { Unit } from "@prisma/client";

export async function getRecipes() {
  const recipes = await db.recipe.findMany({
    include: {
      ingredients: {
        include: { inventoryItem: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const yields = calculateAllYields(recipes);

  return recipes.map((recipe) => ({
    ...recipe,
    yieldResult: yields.find((y) => y.recipeId === recipe.id)!,
  }));
}

export async function getRecipe(id: string) {
  return db.recipe.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: { inventoryItem: true },
      },
    },
  });
}

export async function getActiveInventoryForRecipes() {
  return db.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createRecipe(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const ingredientCount = parseInt(String(raw.ingredientCount || "0"), 10);

  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    ingredients.push({
      inventoryItemId: String(raw[`ingredient_${i}_inventoryItemId`] || ""),
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

  await db.recipe.create({
    data: {
      name: data.name,
      description: data.description || null,
      category: data.category,
      yieldQuantity: data.yieldQuantity,
      yieldUnit: data.yieldUnit,
      instructions: data.instructions || null,
      ingredients: {
        create: data.ingredients.map((ing) => ({
          inventoryItemId: ing.inventoryItemId,
          quantityRequired: ing.quantityRequired,
          unit: ing.unit as Unit,
        })),
      },
    },
  });

  revalidatePath("/recipes");
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
      inventoryItemId: String(raw[`ingredient_${i}_inventoryItemId`] || ""),
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
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: ing.quantityRequired,
            unit: ing.unit as Unit,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/recipes");
  revalidatePath("/");
  revalidatePath("/yield");
  return { success: true };
}

export async function deleteRecipe(id: string) {
  await db.recipe.delete({ where: { id } });

  revalidatePath("/recipes");
  revalidatePath("/");
  revalidatePath("/yield");
  return { success: true };
}

export async function getYieldResults() {
  const recipes = await db.recipe.findMany({
    include: {
      ingredients: {
        include: { inventoryItem: true },
      },
    },
  });

  return calculateAllYields(recipes);
}
