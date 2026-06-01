import type { OrderStatus } from "@prisma/client";

/** Stable status literals (safe if Prisma client cache is stale until restart). */
export const ORDER_STATUS = {
  NEW: "NEW",
  PROCESSING: "PROCESSING",
  PACKING: "PACKING",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatusValue = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Active kitchen / queue pipeline (not terminal). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  ORDER_STATUS.NEW,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.PACKING,
  ORDER_STATUS.READY,
];

export const PIPELINE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.NEW,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.PACKING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELIVERED,
];

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  NEW: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  PROCESSING: [ORDER_STATUS.PACKING, ORDER_STATUS.CANCELLED],
  PACKING: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  READY: [ORDER_STATUS.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: ORDER_STATUS.PROCESSING,
  PROCESSING: ORDER_STATUS.PACKING,
  PACKING: ORDER_STATUS.READY,
  READY: ORDER_STATUS.DELIVERED,
};

export const ADVANCE_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PROCESSING: "Start processing",
  PACKING: "Send to packing (deduct stock)",
  READY: "Mark ready",
  DELIVERED: "Mark delivered / picked up",
};

/** Stock is deducted when leaving the kitchen (→ Packing). */
export function statusDeductionOnTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return from === ORDER_STATUS.PROCESSING && to === ORDER_STATUS.PACKING;
}
