"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { estimateRecipeIngredientCost } from "@/lib/costing";
import { recipePricingSchema } from "@/lib/validations";

export async function updateRecipePricing(recipeId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const salePriceRaw = String(raw.salePrice ?? "").trim();

  const prepRaw = String(raw.prepTimeMinutes ?? "").trim();

  const parsed = recipePricingSchema.safeParse({
    salePrice: salePriceRaw === "" ? null : salePriceRaw,
    prepTimeMinutes: prepRaw === "" ? null : prepRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.recipe.update({
    where: { id: recipeId },
    data: {
      salePrice: parsed.data.salePrice,
      prepTimeMinutes: parsed.data.prepTimeMinutes,
    },
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}/pricing`);
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  revalidatePath("/orders/pos");
  revalidatePath("/orders/kitchen");
  return { success: true };
}

export async function getRecipePricingDetail(recipeId: string) {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
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
    },
  });

  if (!recipe) return null;

  const costEstimate = estimateRecipeIngredientCost(recipe, 1);

  return serializeForClient({ recipe, costEstimate });
}

export async function getRecipesWithPricing() {
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
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
    },
    orderBy: { name: "asc" },
  });

  return serializeForClient(
    recipes.map((recipe) => ({
      ...recipe,
      costEstimate: estimateRecipeIngredientCost(recipe, 1),
    }))
  );
}

export async function getInventoryCostHistory(inventoryItemId: string) {
  const rows = await db.inventoryCostHistory.findMany({
    where: { inventoryItemId },
    orderBy: { effectiveAt: "desc" },
    take: 50,
  });
  return serializeForClient(rows);
}
