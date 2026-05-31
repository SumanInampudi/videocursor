import { Decimal } from "@prisma/client/runtime/library";

type InventoryStock = {
  id: string;
  quantity: Decimal | number;
  unit: string;
  costPerUnit: Decimal | number;
  isActive: boolean;
};

type RecipeIngredientRow = {
  quantityRequired: Decimal | number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    isActive: boolean;
    inventoryItems: InventoryStock[];
  };
};

export type IngredientCostLine = {
  ingredientName: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  source: "inventory" | "missing";
};

export type RecipeCostEstimate = {
  recipeId: string;
  recipeName: string;
  batchCount: number;
  ingredientLines: IngredientCostLine[];
  totalIngredientCost: number;
  unitIngredientCost: number;
  unitSalePrice: number | null;
  unitProfit: number | null;
  marginPercent: number | null;
};

function toNumber(value: Decimal | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return value.toNumber();
}

/** Weighted average cost per unit across active stock with matching unit. */
export function averageCostForIngredient(
  inventoryItems: InventoryStock[],
  unit: string
): { available: number; avgCostPerUnit: number } {
  const matching = inventoryItems.filter(
    (item) => item.isActive && item.unit === unit && toNumber(item.quantity) > 0
  );

  if (matching.length === 0) {
    return { available: 0, avgCostPerUnit: 0 };
  }

  let totalQty = 0;
  let totalValue = 0;

  for (const item of matching) {
    const qty = toNumber(item.quantity);
    const cost = toNumber(item.costPerUnit);
    totalQty += qty;
    totalValue += qty * cost;
  }

  return {
    available: totalQty,
    avgCostPerUnit: totalQty > 0 ? totalValue / totalQty : 0,
  };
}

export function estimateRecipeIngredientCost(
  recipe: {
    id: string;
    name: string;
    salePrice?: Decimal | number | null;
    ingredients: RecipeIngredientRow[];
  },
  batchCount = 1
): RecipeCostEstimate {
  const ingredientLines: IngredientCostLine[] = [];
  let totalIngredientCost = 0;

  for (const row of recipe.ingredients) {
    const requiredPerBatch = toNumber(row.quantityRequired);
    const requiredTotal = requiredPerBatch * batchCount;
    const { available, avgCostPerUnit } = averageCostForIngredient(
      row.ingredient.inventoryItems,
      row.unit
    );

    if (!row.ingredient.isActive || available <= 0 || avgCostPerUnit <= 0) {
      ingredientLines.push({
        ingredientName: row.ingredient.name,
        quantity: requiredTotal,
        unit: row.unit,
        estimatedCost: 0,
        source: "missing",
      });
      continue;
    }

    const lineCost = requiredTotal * avgCostPerUnit;
    totalIngredientCost += lineCost;
    ingredientLines.push({
      ingredientName: row.ingredient.name,
      quantity: requiredTotal,
      unit: row.unit,
      estimatedCost: lineCost,
      source: "inventory",
    });
  }

  const unitIngredientCost = batchCount > 0 ? totalIngredientCost / batchCount : 0;
  const unitSalePrice =
    recipe.salePrice != null ? toNumber(recipe.salePrice) : null;
  const unitProfit =
    unitSalePrice != null ? unitSalePrice - unitIngredientCost : null;
  const marginPercent =
    unitSalePrice != null && unitSalePrice > 0 && unitProfit != null
      ? (unitProfit / unitSalePrice) * 100
      : null;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    batchCount,
    ingredientLines,
    totalIngredientCost,
    unitIngredientCost,
    unitSalePrice,
    unitProfit,
    marginPercent,
  };
}
