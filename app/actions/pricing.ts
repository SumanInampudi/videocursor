"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { estimateRecipeIngredientCost } from "@/lib/costing";
import { recipePricingSchema } from "@/lib/validations";

export async function updateRecipePricing(recipeId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const salePriceRaw = String(raw.salePrice ?? "").trim();

  const parsed = recipePricingSchema.safeParse({
    salePrice: salePriceRaw === "" ? null : salePriceRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.recipe.update({
    where: { id: recipeId },
    data: {
      salePrice: parsed.data.salePrice,
    },
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}/pricing`);
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  return { success: true };
}

export async function getRecipePricingDetail(recipeId: string) {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          ingredient: { include: { inventoryItems: { where: { isActive: true } } } },
        },
      },
    },
  });

  if (!recipe) return null;

  const costEstimate = estimateRecipeIngredientCost(recipe, 1);

  return { recipe, costEstimate };
}

export async function getRecipesWithPricing() {
  const recipes = await db.recipe.findMany({
    include: {
      ingredients: {
        include: {
          ingredient: { include: { inventoryItems: { where: { isActive: true } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return recipes.map((recipe) => ({
    ...recipe,
    costEstimate: estimateRecipeIngredientCost(recipe, 1),
  }));
}

export async function getInventoryCostHistory(inventoryItemId: string) {
  return db.inventoryCostHistory.findMany({
    where: { inventoryItemId },
    orderBy: { effectiveAt: "desc" },
    take: 50,
  });
}
