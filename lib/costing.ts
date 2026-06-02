import { Decimal } from "@prisma/client/runtime/library";
import { estimateLineCostFifo, type CostLayerSnapshot } from "@/lib/inventory-fifo";
import { usableQuantity } from "@/lib/ingredient-wastage";

type InventoryStock = {
  id: string;
  quantity: Decimal | number;
  unit: string;
  costPerUnit: Decimal | number;
  isActive: boolean;
  costLayers?: CostLayerSnapshot[];
};

type RecipeIngredientRow = {
  quantityRequired: Decimal | number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    isActive: boolean;
    wastagePercent?: Decimal | number | null;
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

function mapItemsForFifo(items: InventoryStock[]) {
  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unit: item.unit as import("@prisma/client").Unit,
    costPerUnit: item.costPerUnit,
    isActive: item.isActive,
    costLayers: item.costLayers,
  }));
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
    const waste =
      row.ingredient.wastagePercent != null
        ? toNumber(row.ingredient.wastagePercent)
        : 0;
    const items = mapItemsForFifo(row.ingredient.inventoryItems);
    const matching = items.filter((i) => i.isActive && i.unit === row.unit);
    const physical = matching.reduce((s, i) => s + toNumber(i.quantity), 0);
    const availableUsable = usableQuantity(physical, waste);

    if (!row.ingredient.isActive || availableUsable <= 0) {
      ingredientLines.push({
        ingredientName: row.ingredient.name,
        quantity: requiredTotal,
        unit: row.unit,
        estimatedCost: 0,
        source: "missing",
      });
      continue;
    }

    const { cost: lineCost } = estimateLineCostFifo({
      requiredQty: requiredTotal,
      unit: row.unit as import("@prisma/client").Unit,
      wastagePercent: waste,
      inventoryItems: items,
    });

    if (lineCost <= 0) {
      ingredientLines.push({
        ingredientName: row.ingredient.name,
        quantity: requiredTotal,
        unit: row.unit,
        estimatedCost: 0,
        source: "missing",
      });
      continue;
    }

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
