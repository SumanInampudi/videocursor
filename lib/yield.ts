import { Decimal } from "@prisma/client/runtime/library";

type IngredientWithItem = {
  quantityRequired: Decimal | number;
  unit: string;
  inventoryItem: {
    id: string;
    name: string;
    quantity: Decimal | number;
    unit: string;
    isActive: boolean;
  };
};

type RecipeWithIngredients = {
  id: string;
  name: string;
  category: string;
  yieldQuantity: Decimal | number;
  yieldUnit: string;
  ingredients: IngredientWithItem[];
};

export type YieldResult = {
  recipeId: string;
  recipeName: string;
  category: string;
  yieldUnit: string;
  maxYield: number;
  bottleneckIngredient: string | null;
  missingIngredients: string[];
  canMake: boolean;
};

function toNumber(value: Decimal | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return value.toNumber();
}

export function calculateRecipeYield(recipe: RecipeWithIngredients): YieldResult {
  if (recipe.ingredients.length === 0) {
    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      category: recipe.category,
      yieldUnit: recipe.yieldUnit,
      maxYield: 0,
      bottleneckIngredient: null,
      missingIngredients: ["No ingredients defined"],
      canMake: false,
    };
  }

  const missingIngredients: string[] = [];
  let minYield = Infinity;
  let bottleneckIngredient: string | null = null;

  for (const ingredient of recipe.ingredients) {
    const item = ingredient.inventoryItem;

    if (!item.isActive) {
      missingIngredients.push(`${item.name} (inactive)`);
      minYield = 0;
      continue;
    }

    if (item.unit !== ingredient.unit) {
      missingIngredients.push(
        `${item.name} (unit mismatch: need ${ingredient.unit}, have ${item.unit})`
      );
      minYield = 0;
      continue;
    }

    const available = toNumber(item.quantity);
    const required = toNumber(ingredient.quantityRequired);

    if (available <= 0) {
      missingIngredients.push(item.name);
      minYield = 0;
      continue;
    }

    const possible = Math.floor(available / required);

    if (possible < minYield) {
      minYield = possible;
      bottleneckIngredient = item.name;
    }
  }

  if (minYield === Infinity) minYield = 0;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    category: recipe.category,
    yieldUnit: recipe.yieldUnit,
    maxYield: minYield,
    bottleneckIngredient,
    missingIngredients,
    canMake: minYield > 0 && missingIngredients.length === 0,
  };
}

export function calculateAllYields(recipes: RecipeWithIngredients[]): YieldResult[] {
  return recipes
    .map(calculateRecipeYield)
    .sort((a, b) => b.maxYield - a.maxYield);
}

export function isLowStock(
  quantity: Decimal | number | string,
  reorderLevel: Decimal | number | string
): boolean {
  return toNumber(quantity) <= toNumber(reorderLevel);
}
