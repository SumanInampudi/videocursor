import type { Order, OrderChannel, OrderStatus } from "@prisma/client";

const CLOSED_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];

/** Dine-in tab still open (bill not paid / not closed). */
export function isOpenTableOrder(order: {
  channel: OrderChannel;
  paidAt: Date | string | null;
  status: OrderStatus;
}): boolean {
  return (
    order.channel === "DINE_IN" &&
    order.paidAt == null &&
    !CLOSED_STATUSES.includes(order.status)
  );
}

export type OpenTableOrderSummary = {
  id: string;
  orderNumber: string;
  tableLabel: string | null;
  diningTableId: string | null;
  customerName: string | null;
  covers: number | null;
  status: OrderStatus;
  createdAt: Date | string;
  lineCount: number;
  total: number;
};

export function openOrderTotal(order: {
  subtotal?: number | { toString(): string } | null;
  discountTotal?: number | { toString(): string } | null;
  lineItems: { quantity: number; unitSalePrice: number | { toString(): string } }[];
}): number {
  const lineSubtotal = order.lineItems.reduce(
    (s, l) => s + Number(l.unitSalePrice) * l.quantity,
    0
  );
  const subtotal = order.subtotal != null ? Number(order.subtotal) : lineSubtotal;
  const discount = Number(order.discountTotal ?? 0);
  return Math.max(0, subtotal - discount);
}
