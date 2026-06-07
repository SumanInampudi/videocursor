import { Decimal } from "@prisma/client/runtime/library";
import type { Unit } from "@prisma/client";
import { planInventoryDeductions } from "@/lib/orderFulfillment";
import type { ProductForStockPlan } from "@/lib/product-fulfillment";

type PrepProductForBatch = {
  id: string;
  name: string;
  yieldQuantity: Decimal | number;
  prepOutputInventoryItemId: string | null;
  ingredients: ProductForStockPlan["ingredients"];
  prepOutputInventoryItem?: {
    id: string;
    quantity: Decimal | number;
    unit: Unit;
    costPerUnit: Decimal | number;
  } | null;
};

function toNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function scalePrepBatchMultiplier(
  prep: Pick<PrepProductForBatch, "yieldQuantity">,
  outputQuantity: number
): { ok: true; multiplier: number } | { ok: false; error: string } {
  const yieldQty = toNumber(prep.yieldQuantity);
  if (yieldQty <= 0) {
    return { ok: false, error: "Prep recipe yield must be greater than 0" };
  }
  if (outputQuantity <= 0) {
    return { ok: false, error: "Output quantity must be greater than 0" };
  }
  return { ok: true, multiplier: outputQuantity / yieldQty };
}

export function planPrepBatchProduction(
  prep: PrepProductForBatch,
  outputQuantity: number
):
  | {
      ok: true;
      multiplier: number;
      totalInputCost: number;
      costPerUnit: number;
      consumptions: { inventoryItemId: string; quantityDeducted: number; unit: Unit; costPerUnit: number; lineCost: number }[];
    }
  | { ok: false; error: string } {
  if (!prep.prepOutputInventoryItemId || !prep.prepOutputInventoryItem) {
    return { ok: false, error: "Prep item has no output stock link" };
  }

  const scaled = scalePrepBatchMultiplier(prep, outputQuantity);
  if (!scaled.ok) return scaled;

  const plan = planInventoryDeductions(prep.ingredients, scaled.multiplier);
  if (!plan.ok) return { ok: false, error: plan.error };

  const totalInputCost = plan.totalCost;
  const costPerUnit = outputQuantity > 0 ? totalInputCost / outputQuantity : 0;

  return {
    ok: true,
    multiplier: scaled.multiplier,
    totalInputCost,
    costPerUnit,
    consumptions: plan.consumptions,
  };
}
