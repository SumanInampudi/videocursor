import type { OrderChannel } from "@prisma/client";

export function orderChannelLabel(channel: OrderChannel): string {
  return channel === "ONLINE" ? "Online" : "Dine-in";
}

export function orderTicketLabel(order: {
  channel: OrderChannel;
  tableLabel?: string | null;
  externalRef?: string | null;
  customerName?: string | null;
  orderNumber: string;
}): string {
  if (order.channel === "DINE_IN" && order.tableLabel) {
    return order.tableLabel;
  }
  if (order.channel === "ONLINE") {
    return order.externalRef?.trim() || order.customerName?.trim() || "Online";
  }
  return order.customerName?.trim() || order.orderNumber;
}
