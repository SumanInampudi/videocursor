import { estimateOrderPrepMinutes, formatPrepDuration } from "@/lib/order-prep-time";
import { sortOrdersByReceived } from "@/lib/orders-sort";
import type { OrderChannel, OrderStatus } from "@prisma/client";

/** How long READY orders stay on the customer-facing live queue display. */
export const PUBLIC_QUEUE_READY_VISIBLE_MS = 5 * 60 * 1000;

export const PUBLIC_QUEUE_STATUS_LABELS: Record<
  Exclude<OrderStatus, "DELIVERED" | "CANCELLED">,
  string
> = {
  NEW: "Order received",
  PROCESSING: "Being prepared",
  PACKING: "Being packed",
  READY: "Ready for pickup",
};

export const PUBLIC_QUEUE_STATUS_LABELS_DINE_IN: Record<
  Exclude<OrderStatus, "DELIVERED" | "CANCELLED">,
  string
> = {
  NEW: "Order received",
  PROCESSING: "Being prepared",
  PACKING: "Being prepared",
  READY: "Ready to serve",
};

export type PublicQueueOrderInput = {
  orderNumber: string;
  status: OrderStatus;
  channel: OrderChannel;
  customerName?: string | null;
  tableLabel?: string | null;
  createdAt: Date | string;
  processedAt?: Date | string | null;
  packingAt?: Date | string | null;
  readyAt?: Date | string | null;
  estimatedPrepMinutes?: number | null;
  lineItems?: { quantity: number; kitchenDoneQty?: number }[];
};

export type PublicQueueTicket = {
  orderNumber: string;
  displayTicket: string;
  status: OrderStatus;
  statusLabel: string;
  channel: OrderChannel;
  customerName: string | null;
  tableLabel: string | null;
  createdAt: string;
  estimatedPrepMinutes: number | null;
  waitLabel: string;
  stepIndex: number;
  stepCount: number;
  itemsDone: number;
  itemsTotal: number;
  itemsProgressLabel: string | null;
};

export function formatPublicTicketNumber(orderNumber: string): string {
  const parts = orderNumber.split("-");
  const tail = parts[parts.length - 1];
  return tail && tail.length <= 8 ? `#${tail}` : orderNumber;
}

function queueStepIndex(status: OrderStatus, channel: OrderChannel): number {
  if (channel === "DINE_IN") {
    switch (status) {
      case "NEW":
        return 1;
      case "PROCESSING":
      case "PACKING":
        return 2;
      case "READY":
        return 3;
      default:
        return 1;
    }
  }
  switch (status) {
    case "NEW":
      return 1;
    case "PROCESSING":
      return 2;
    case "PACKING":
      return 3;
    case "READY":
      return 4;
    default:
      return 1;
  }
}

export function publicQueueStepCount(channel: OrderChannel): number {
  return channel === "DINE_IN" ? 3 : 4;
}

type PublicQueueReadyTiming = Pick<
  PublicQueueOrderInput,
  "readyAt" | "packingAt" | "processedAt"
>;

function resolveReadySinceMs(order: PublicQueueReadyTiming): number | null {
  const ts = order.readyAt ?? order.packingAt ?? order.processedAt;
  if (!ts) return null;
  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Whether an order should appear on the public live queue (excludes stale READY). */
export function isVisibleOnPublicQueue(
  order: Pick<PublicQueueOrderInput, "status"> & PublicQueueReadyTiming,
  nowMs: number = Date.now()
): boolean {
  if (order.status === "DELIVERED" || order.status === "CANCELLED") return false;
  if (order.status !== "READY") return true;
  const readySince = resolveReadySinceMs(order);
  if (readySince == null) return true;
  return nowMs - readySince < PUBLIC_QUEUE_READY_VISIBLE_MS;
}

export function kitchenItemsProgress(lineItems: { quantity: number; kitchenDoneQty?: number }[]) {
  const itemsTotal = lineItems.reduce((s, l) => s + l.quantity, 0);
  const itemsDone = lineItems.reduce(
    (s, l) => s + Math.min(l.quantity, Math.max(0, l.kitchenDoneQty ?? 0)),
    0
  );
  const itemsProgressLabel =
    itemsTotal > 0
      ? `${itemsDone} of ${itemsTotal} item${itemsTotal === 1 ? "" : "s"} ready`
      : null;
  return { itemsDone, itemsTotal, itemsProgressLabel };
}

export function buildPublicQueueTicket(order: PublicQueueOrderInput): PublicQueueTicket | null {
  if (!isVisibleOnPublicQueue(order)) {
    return null;
  }
  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    return null;
  }

  const isDineIn = order.channel === "DINE_IN";
  const statusLabels = isDineIn
    ? PUBLIC_QUEUE_STATUS_LABELS_DINE_IN
    : PUBLIC_QUEUE_STATUS_LABELS;
  const statusLabel = statusLabels[order.status];
  const created = new Date(order.createdAt).getTime();
  const now = Date.now();
  const elapsedMin = Math.max(0, (now - created) / 60_000);
  const est = order.estimatedPrepMinutes ?? null;

  const { itemsDone, itemsTotal, itemsProgressLabel } = kitchenItemsProgress(
    order.lineItems ?? []
  );

  let waitLabel: string;
  if (order.status === "READY") {
    waitLabel = isDineIn
      ? "Ready — your table will be served shortly"
      : "Ready now — please collect your order";
  } else if (order.status === "PACKING" && !isDineIn) {
    waitLabel = "Packing your order";
  } else if (
    itemsProgressLabel &&
    itemsDone > 0 &&
    itemsDone < itemsTotal &&
    (order.status === "PROCESSING" || order.status === "PACKING")
  ) {
    waitLabel = itemsProgressLabel;
  } else if (est != null && est > 0) {
    const remaining = Math.ceil(est - elapsedMin);
    if (remaining <= 0) {
      waitLabel = "Almost ready — finishing up";
    } else {
      waitLabel = `About ${formatPrepDuration(remaining)} remaining`;
    }
  } else {
    waitLabel = "Preparation in progress";
  }

  const customerName = order.customerName?.trim() || null;

  return {
    orderNumber: order.orderNumber,
    displayTicket: formatPublicTicketNumber(order.orderNumber),
    status: order.status,
    statusLabel,
    channel: order.channel,
    customerName,
    createdAt: new Date(order.createdAt).toISOString(),
    tableLabel:
      order.channel === "DINE_IN" && order.tableLabel?.trim()
        ? order.tableLabel.trim()
        : null,
    estimatedPrepMinutes: est,
    waitLabel,
    stepIndex: queueStepIndex(order.status, order.channel),
    stepCount: publicQueueStepCount(order.channel),
    itemsDone,
    itemsTotal,
    itemsProgressLabel,
  };
}

/** Oldest received first (FIFO within a queue column). */
export function sortPublicQueueTickets(
  tickets: PublicQueueTicket[]
): PublicQueueTicket[] {
  return sortOrdersByReceived(tickets);
}

export function estimatePrepForLineItems(
  lineItems: { quantity: number; recipe: { prepTimeMinutes: number | null } | null }[]
): number | null {
  return estimateOrderPrepMinutes(
    lineItems.map((l) => ({
      quantity: l.quantity,
      prepTimeMinutes: l.recipe?.prepTimeMinutes ?? null,
    }))
  );
}
