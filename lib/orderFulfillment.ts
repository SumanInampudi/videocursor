import { Decimal } from "@prisma/client/runtime/library";
import { Unit } from "@prisma/client";
import {
  type CostLayerSnapshot,
  planFifoConsumption,
  type FifoConsumptionSlice,
} from "@/lib/inventory-fifo";

type StockItem = {
  id: string;
  quantity: Decimal;
  unit: Unit;
  costPerUnit: Decimal;
  isActive: boolean;
  costLayers?: CostLayerSnapshot[];
};

type RecipeIngredientRow = {
  quantityRequired: Decimal;
  unit: Unit;
  ingredient: {
    name: string;
    wastagePercent?: Decimal | number | null;
    inventoryItems: StockItem[];
  };
};

export type ConsumptionPlan = FifoConsumptionSlice;

export type FulfillmentResult =
  | { ok: true; consumptions: ConsumptionPlan[]; totalCost: number }
  | { ok: false; error: string };

function toNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

function mapLayers(
  items: StockItem[]
): Parameters<typeof planFifoConsumption>[0]["inventoryItems"] {
  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unit: item.unit,
    costPerUnit: item.costPerUnit,
    isActive: item.isActive,
    costLayers: item.costLayers,
  }));
}

/**
 * FIFO deduction plan with ingredient wastage applied to usable stock and recipe cost.
 */
export function planInventoryDeductions(
  ingredients: RecipeIngredientRow[],
  batchCount: number
): FulfillmentResult {
  const consumptions: ConsumptionPlan[] = [];

  for (const row of ingredients) {
    const needed = toNumber(row.quantityRequired) * batchCount;
    const result = planFifoConsumption({
      needed,
      unit: row.unit,
      wastagePercent:
        row.ingredient.wastagePercent != null
          ? toNumber(row.ingredient.wastagePercent as Decimal)
          : 0,
      inventoryItems: mapLayers(row.ingredient.inventoryItems),
    });

    if (!result.ok) {
      return {
        ok: false,
        error: `Insufficient stock for ${row.ingredient.name}: ${result.error}`,
      };
    }

    consumptions.push(...result.consumptions);
  }

  const totalCost = consumptions.reduce((sum, c) => sum + c.lineCost, 0);
  return { ok: true, consumptions, totalCost };
}
