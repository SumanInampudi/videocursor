import type { OrderStatus } from "@prisma/client";

/** Statuses that may be cancelled (not terminal). */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["NEW", "PROCESSING", "READY"];

export function canCancelOrder(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function cancelRequiresStockRestore(status: OrderStatus): boolean {
  return status === "READY";
}
