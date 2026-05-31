import { Decimal } from "@prisma/client/runtime/library";
import { Unit } from "@prisma/client";

type StockItem = {
  id: string;
  quantity: Decimal;
  unit: Unit;
  costPerUnit: Decimal;
  isActive: boolean;
};

type RecipeIngredientRow = {
  quantityRequired: Decimal;
  unit: Unit;
  ingredient: {
    name: string;
    inventoryItems: StockItem[];
  };
};

export type ConsumptionPlan = {
  inventoryItemId: string;
  quantityDeducted: number;
  unit: Unit;
  costPerUnit: number;
  lineCost: number;
};

export type FulfillmentResult =
  | { ok: true; consumptions: ConsumptionPlan[]; totalCost: number }
  | { ok: false; error: string };

function toNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

/**
 * Build a deduction plan from active inventory (matching unit), highest qty first.
 */
export function planInventoryDeductions(
  ingredients: RecipeIngredientRow[],
  batchCount: number
): FulfillmentResult {
  const consumptions: ConsumptionPlan[] = [];

  for (const row of ingredients) {
    const needed = toNumber(row.quantityRequired) * batchCount;
    const matching = row.ingredient.inventoryItems
      .filter((item) => item.isActive && item.unit === row.unit)
      .sort((a, b) => toNumber(b.quantity) - toNumber(a.quantity));

    let remaining = needed;

    for (const item of matching) {
      if (remaining <= 0) break;
      const available = toNumber(item.quantity);
      if (available <= 0) continue;

      const take = Math.min(available, remaining);
      const costPerUnit = toNumber(item.costPerUnit);
      consumptions.push({
        inventoryItemId: item.id,
        quantityDeducted: take,
        unit: row.unit,
        costPerUnit,
        lineCost: take * costPerUnit,
      });
      remaining -= take;
    }

    if (remaining > 0.0001) {
      return {
        ok: false,
        error: `Insufficient stock for ${row.ingredient.name}: need ${needed} ${row.unit}, short by ${remaining.toFixed(2)} ${row.unit}`,
      };
    }
  }

  const totalCost = consumptions.reduce((sum, c) => sum + c.lineCost, 0);
  return { ok: true, consumptions, totalCost };
}
