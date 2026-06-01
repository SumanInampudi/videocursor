import "server-only";

import { db } from "@/lib/db";
import { checkStockForRecipes, type OrderLineStockInput } from "@/lib/order-stock-check";

async function loadRecipesForStockCheck(businessId: string, recipeIds: string[]) {
  if (recipeIds.length === 0) return [];
  return db.recipe.findMany({
    where: { id: { in: recipeIds }, businessId },
    select: {
      id: true,
      name: true,
      ingredients: {
        include: {
          ingredient: { include: { inventoryItems: true } },
        },
      },
    },
  });
}

/** Validate lines against current inventory (merges open-tab lines when adding). */
export async function validateOrderLinesStock(
  businessId: string,
  lines: OrderLineStockInput[],
  options?: { existingOrderId?: string }
): Promise<{ ok: true } | { ok: false; issues: string[] }> {
  let linesToCheck = lines;

  if (options?.existingOrderId) {
    const order = await db.order.findFirst({
      where: { id: options.existingOrderId, businessId },
      include: {
        lineItems: {
          select: {
            recipeId: true,
            quantity: true,
            processedAt: true,
            recipeName: true,
          },
        },
      },
    });
    if (order) {
      const combined: OrderLineStockInput[] = order.lineItems
        .filter((l) => l.recipeId && l.processedAt == null)
        .map((l) => ({
          recipeId: l.recipeId!,
          quantity: l.quantity,
          recipeName: l.recipeName,
        }));

      for (const line of lines) {
        const existing = combined.find((c) => c.recipeId === line.recipeId);
        if (existing) {
          existing.quantity += line.quantity;
        } else {
          combined.push(line);
        }
      }
      linesToCheck = combined;
    }
  }

  const recipeIds = [...new Set(linesToCheck.map((l) => l.recipeId))];
  const recipes = await loadRecipesForStockCheck(businessId, recipeIds);
  return checkStockForRecipes(recipes, linesToCheck);
}
