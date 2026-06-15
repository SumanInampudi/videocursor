import { usableQuantity } from "@/lib/ingredient-wastage";
import { isLowStock } from "@/lib/yield";

export const RAW_MATERIAL_LOW_STOCK_KEY = "__low_stock__";

type StockLine = {
  quantity: number | string;
  reorderLevel: number | string;
  unit: string;
  isActive: boolean;
};

export type RawMaterialStockStatus =
  | { kind: "no_stock" }
  | { kind: "out"; totalQty: number; unit: string }
  | { kind: "low"; totalQty: number; unit: string }
  | { kind: "ok"; totalQty: number; unit: string };

export function getRawMaterialStockStatus(
  wastagePercent: number | string | null | undefined,
  inventoryItems?: StockLine[] | null
): RawMaterialStockStatus {
  const active = (inventoryItems ?? []).filter((item) => item.isActive);
  if (active.length === 0) return { kind: "no_stock" };

  const waste = Number(wastagePercent ?? 0);
  const unit = active[0]?.unit ?? "";
  let totalQty = 0;
  let anyLow = false;
  let allOut = true;

  for (const item of active) {
    const physical = Number(item.quantity);
    const usable = usableQuantity(physical, waste);
    totalQty += physical;
    if (physical > 0) allOut = false;
    if (isLowStock(usable, item.reorderLevel)) anyLow = true;
  }

  if (allOut) return { kind: "out", totalQty, unit };
  if (anyLow) return { kind: "low", totalQty, unit };
  return { kind: "ok", totalQty, unit };
}

export function isRawMaterialLowStock(
  wastagePercent: number | string | null | undefined,
  inventoryItems?: StockLine[] | null
): boolean {
  const status = getRawMaterialStockStatus(wastagePercent, inventoryItems);
  return status.kind === "low" || status.kind === "out";
}
