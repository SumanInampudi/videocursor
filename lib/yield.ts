import { Decimal } from "@prisma/client/runtime/library";

type IngredientWithItem = {
  quantityRequired: Decimal | number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    isActive: boolean;
    inventoryItems: {
      id: string;
      name: string;
      quantity: Decimal | number;
      unit: string;
      isActive: boolean;
    }[];
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

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = recipeIngredient.ingredient;

    if (!ingredient.isActive) {
      missingIngredients.push(`${ingredient.name} (inactive)`);
      minYield = 0;
      continue;
    }

    const matchingItems = ingredient.inventoryItems.filter(
      (item) => item.isActive && item.unit === recipeIngredient.unit
    );

    const mismatchedItems = ingredient.inventoryItems.filter(
      (item) => item.isActive && item.unit !== recipeIngredient.unit
    );

    if (matchingItems.length === 0 && mismatchedItems.length > 0) {
      const units = Array.from(new Set(mismatchedItems.map((item) => item.unit))).join(", ");
      missingIngredients.push(
        `${ingredient.name} (unit mismatch: need ${recipeIngredient.unit}, have ${units})`
      );
      minYield = 0;
      continue;
    }

    const available = matchingItems.reduce((sum, item) => sum + toNumber(item.quantity), 0);
    const required = toNumber(recipeIngredient.quantityRequired);

    if (available <= 0) {
      missingIngredients.push(ingredient.name);
      minYield = 0;
      continue;
    }

    const possible = Math.floor(available / required);

    if (possible < minYield) {
      minYield = possible;
      bottleneckIngredient = ingredient.name;
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
