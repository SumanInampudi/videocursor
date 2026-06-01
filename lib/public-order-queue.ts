import { estimateOrderPrepMinutes, formatPrepDuration } from "@/lib/order-prep-time";
import { sortOrdersByReceived } from "@/lib/orders-sort";
import type { OrderChannel, OrderStatus } from "@prisma/client";

export const PUBLIC_QUEUE_STATUS_LABELS: Record<
  Exclude<OrderStatus, "DELIVERED" | "CANCELLED">,
  string
> = {
  NEW: "Order received",
  PROCESSING: "Being prepared",
  READY: "Ready for pickup",
};

export type PublicQueueOrderInput = {
  orderNumber: string;
  status: OrderStatus;
  channel: OrderChannel;
  customerName?: string | null;
  tableLabel?: string | null;
  createdAt: Date | string;
  processedAt?: Date | string | null;
  readyAt?: Date | string | null;
  estimatedPrepMinutes?: number | null;
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
};

export function formatPublicTicketNumber(orderNumber: string): string {
  const parts = orderNumber.split("-");
  const tail = parts[parts.length - 1];
  return tail && tail.length <= 8 ? `#${tail}` : orderNumber;
}

export function buildPublicQueueTicket(order: PublicQueueOrderInput): PublicQueueTicket | null {
  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    return null;
  }

  const statusLabel = PUBLIC_QUEUE_STATUS_LABELS[order.status];
  const created = new Date(order.createdAt).getTime();
  const now = Date.now();
  const elapsedMin = Math.max(0, (now - created) / 60_000);
  const est = order.estimatedPrepMinutes ?? null;

  let waitLabel: string;
  if (order.status === "READY") {
    waitLabel = "Ready now — please collect your order";
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

  const stepIndex =
    order.status === "NEW" ? 1 : order.status === "PROCESSING" ? 2 : 3;

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
    stepIndex,
    stepCount: 3,
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
