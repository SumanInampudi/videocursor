import { usableQuantity } from "@/lib/ingredient-wastage";
import { isLowStock } from "@/lib/yield";

export { RAW_MATERIAL_LOW_STOCK_KEY as INVENTORY_LOW_STOCK_KEY } from "@/lib/raw-material-stock";

export type InventoryStockRow = {
  quantity: number | string;
  reorderLevel: number | string;
  unit: string;
  isActive: boolean;
  ingredient?: { wastagePercent: number | null } | null;
};

export type InventoryStockStatus =
  | { kind: "inactive" }
  | { kind: "out"; physical: number; unit: string }
  | { kind: "low"; physical: number; unit: string }
  | { kind: "ok"; physical: number; unit: string };

export function getInventoryStockStatus(item: InventoryStockRow): InventoryStockStatus {
  if (!item.isActive) return { kind: "inactive" };

  const physical = Number(item.quantity);
  const waste = Number(item.ingredient?.wastagePercent ?? 0);
  const usable = usableQuantity(physical, waste);
  const low = isLowStock(usable, item.reorderLevel);

  if (physical <= 0) return { kind: "out", physical, unit: item.unit };
  if (low) return { kind: "low", physical, unit: item.unit };
  return { kind: "ok", physical, unit: item.unit };
}

export function isInventoryItemLowStock(item: InventoryStockRow): boolean {
  const status = getInventoryStockStatus(item);
  return status.kind === "low" || status.kind === "out";
}

export function inventoryStatusLabel(status: InventoryStockStatus): string {
  if (status.kind === "inactive") return "Inactive";
  if (status.kind === "out") return "Out of stock";
  if (status.kind === "low") return "Low stock";
  return "In stock";
}

export function inventoryStatusClass(status: InventoryStockStatus): string {
  if (status.kind === "inactive") return "text-gray-400";
  if (status.kind === "out") return "font-medium text-red-700";
  if (status.kind === "low") return "font-medium text-amber-700";
  return "text-gray-600";
}
