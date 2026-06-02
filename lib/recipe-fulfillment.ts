import { Decimal } from "@prisma/client/runtime/library";
import { RecipeType, Unit } from "@prisma/client";
import {
  type CostLayerSnapshot,
  planFifoConsumption,
  type FifoConsumptionSlice,
} from "@/lib/inventory-fifo";
import { planInventoryDeductions, type FulfillmentResult } from "@/lib/orderFulfillment";

type StockItem = {
  id: string;
  quantity: Decimal | number;
  unit: Unit;
  costPerUnit: Decimal | number;
  isActive: boolean;
  costLayers?: CostLayerSnapshot[];
  ingredient?: { wastagePercent?: Decimal | number | null } | null;
};

export type RecipeForStockPlan = {
  id: string;
  name: string;
  recipeType: RecipeType;
  ingredients: Parameters<typeof planInventoryDeductions>[0];
  retailInventoryItem?: StockItem | null;
  retailQuantityPerSale?: Decimal | number | null;
};

function toNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function isRetailRecipe(recipe: { recipeType?: RecipeType }): boolean {
  return recipe.recipeType === RecipeType.RETAIL;
}

export function recipeRequiresKitchen(recipe: {
  recipeType: RecipeType;
  requiresKitchen: boolean;
}): boolean {
  if (isRetailRecipe(recipe)) return recipe.requiresKitchen;
  return recipe.requiresKitchen;
}

export function planRecipeStockDeduction(
  recipe: RecipeForStockPlan,
  batchCount: number
): FulfillmentResult {
  if (!isRetailRecipe(recipe)) {
    return planInventoryDeductions(recipe.ingredients, batchCount);
  }

  const item = recipe.retailInventoryItem;
  const perSale = recipe.retailQuantityPerSale;
  if (!item) {
    return { ok: false, error: `Retail item "${recipe.name}" has no inventory link` };
  }
  if (perSale == null || toNumber(perSale) <= 0) {
    return { ok: false, error: `Retail item "${recipe.name}" has invalid quantity per sale` };
  }

  const needed = toNumber(perSale) * batchCount;
  const waste =
    item.ingredient?.wastagePercent != null ? toNumber(item.ingredient.wastagePercent) : 0;

  const result = planFifoConsumption({
    needed,
    unit: item.unit,
    wastagePercent: waste,
    inventoryItems: [
      {
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        isActive: item.isActive,
        costLayers: item.costLayers,
      },
    ],
  });

  if (!result.ok) {
    return { ok: false, error: `Insufficient stock for ${recipe.name}: ${result.error}` };
  }

  return {
    ok: true,
    consumptions: result.consumptions as FifoConsumptionSlice[],
    totalCost: result.totalCost,
  };
}

/** Kitchen display / prep timers — only lines that need the kitchen. */
export function isKitchenLine(recipe: {
  recipeType?: RecipeType;
  requiresKitchen?: boolean;
} | null | undefined): boolean {
  if (!recipe) return true;
  return recipeRequiresKitchen({
    recipeType: recipe.recipeType ?? RecipeType.PREPARED,
    requiresKitchen: recipe.requiresKitchen ?? true,
  });
}

export type KitchenLineLike = {
  quantity: number;
  kitchenDoneQty?: number;
  recipe?: { recipeType?: RecipeType; requiresKitchen?: boolean } | null;
};

export function filterKitchenLines<T extends KitchenLineLike>(lines: T[]): T[] {
  return lines.filter((l) => isKitchenLine(l.recipe));
}

export function kitchenLineProgressForKitchen(lines: KitchenLineLike[]): {
  done: number;
  total: number;
} {
  const kitchen = filterKitchenLines(lines);
  const total = kitchen.reduce((s, l) => s + l.quantity, 0);
  const done = kitchen.reduce(
    (s, l) => s + Math.min(l.quantity, Math.max(0, l.kitchenDoneQty ?? 0)),
    0
  );
  return { done, total };
}
