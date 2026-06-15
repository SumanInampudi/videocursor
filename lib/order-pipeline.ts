import type { OrderChannel, OrderStatus } from "@prisma/client";

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

/** Dine-in: food goes to table — no packing step. */
export const DINE_IN_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  NEW: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  PROCESSING: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  PACKING: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  READY: [ORDER_STATUS.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

export function statusFlowForChannel(channel: OrderChannel): Record<OrderStatus, OrderStatus[]> {
  return channel === "DINE_IN" ? DINE_IN_STATUS_FLOW : STATUS_FLOW;
}

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: ORDER_STATUS.PROCESSING,
  PROCESSING: ORDER_STATUS.PACKING,
  PACKING: ORDER_STATUS.READY,
  READY: ORDER_STATUS.DELIVERED,
};

export function nextStatusForChannel(
  status: OrderStatus,
  channel: OrderChannel
): OrderStatus | undefined {
  if (channel === "DINE_IN") {
    if (status === ORDER_STATUS.NEW) return ORDER_STATUS.PROCESSING;
    if (status === ORDER_STATUS.PROCESSING || status === ORDER_STATUS.PACKING) {
      return ORDER_STATUS.READY;
    }
    if (status === ORDER_STATUS.READY) return ORDER_STATUS.DELIVERED;
    return undefined;
  }
  return NEXT_STATUS[status];
}

/** Counter display advances retail-only tickets through the same status pipeline. */
export function getCounterNextAction(
  status: OrderStatus,
  channel: OrderChannel
): { label: string; status: OrderStatus } | undefined {
  const next = nextStatusForChannel(status, channel);
  if (!next) return undefined;

  if (channel === "DINE_IN") {
    if (status === ORDER_STATUS.NEW) return { label: "Start picking", status: next };
    if (status === ORDER_STATUS.PROCESSING || status === ORDER_STATUS.PACKING) {
      return { label: "Ready for pickup", status: ORDER_STATUS.READY };
    }
    if (status === ORDER_STATUS.READY) {
      return { label: "Picked up", status: ORDER_STATUS.DELIVERED };
    }
    return undefined;
  }

  const labels: Partial<Record<OrderStatus, string>> = {
    NEW: "Start picking",
    PROCESSING: "Bag",
    PACKING: "Ready",
    READY: "Picked up",
  };
  return { label: labels[status] ?? next, status: next };
}

export function getKitchenNextAction(
  status: OrderStatus,
  channel: OrderChannel
): { label: string; status: OrderStatus } | undefined {
  const next = nextStatusForChannel(status, channel);
  if (!next) return undefined;

  if (channel === "DINE_IN") {
    if (status === ORDER_STATUS.NEW) return { label: "Start", status: next };
    if (status === ORDER_STATUS.PROCESSING || status === ORDER_STATUS.PACKING) {
      return { label: "Ready (deduct stock)", status: ORDER_STATUS.READY };
    }
    if (status === ORDER_STATUS.READY) {
      return { label: "Served / picked up", status: ORDER_STATUS.DELIVERED };
    }
    return undefined;
  }

  const labels: Partial<Record<OrderStatus, string>> = {
    NEW: "Start",
    PROCESSING: "Pack",
    PACKING: "Ready",
    READY: "Picked up",
  };
  return { label: labels[status] ?? next, status: next };
}

export const ADVANCE_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PROCESSING: "Start processing",
  PACKING: "Send to packing (deduct stock)",
  READY: "Mark ready",
  DELIVERED: "Mark delivered / picked up",
};

/** Stock is deducted when leaving the kitchen (→ Packing online, → Ready dine-in). */
export function statusDeductionOnTransition(
  from: OrderStatus,
  to: OrderStatus,
  channel: OrderChannel = "ONLINE"
): boolean {
  if (channel === "DINE_IN") {
    return from === ORDER_STATUS.PROCESSING && to === ORDER_STATUS.READY;
  }
  return from === ORDER_STATUS.PROCESSING && to === ORDER_STATUS.PACKING;
}
