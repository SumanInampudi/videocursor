import { planRecipeStockDeduction, type RecipeForStockPlan } from "@/lib/recipe-fulfillment";

export type OrderLineStockInput = {
  recipeId: string;
  quantity: number;
  recipeName?: string;
};

/**
 * Merge lines by recipeId (sum quantities) for stock planning.
 */
export function mergeOrderLinesByRecipe(
  lines: OrderLineStockInput[]
): Map<string, { recipeId: string; quantity: number; recipeName?: string }> {
  const map = new Map<string, { recipeId: string; quantity: number; recipeName?: string }>();
  for (const line of lines) {
    const existing = map.get(line.recipeId);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      map.set(line.recipeId, { ...line });
    }
  }
  return map;
}

/** Check whether active inventory can cover all lines (no deduction). */
export function checkStockForRecipes(
  recipes: RecipeForStockPlan[],
  lines: OrderLineStockInput[]
): { ok: true } | { ok: false; issues: string[] } {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const merged = mergeOrderLinesByRecipe(lines);
  const issues: string[] = [];

  for (const line of merged.values()) {
    const recipe = recipeMap.get(line.recipeId);
    if (!recipe) {
      issues.push(`"${line.recipeName ?? line.recipeId}": menu item not found`);
      continue;
    }
    const plan = planRecipeStockDeduction(recipe, line.quantity);
    if (!plan.ok) {
      issues.push(`"${recipe.name}" (${line.quantity}×): ${plan.error}`);
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
