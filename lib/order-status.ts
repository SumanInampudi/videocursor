import { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  PROCESSING: "Processing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Customer-facing queue copy (also in lib/public-order-queue.ts). */
export const CUSTOMER_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  NEW: "Order received",
  PROCESSING: "Being prepared",
  READY: "Ready for pickup",
};

export function orderStatusBadgeVariant(
  status: OrderStatus
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case OrderStatus.NEW:
      return "warning";
    case OrderStatus.PROCESSING:
      return "default";
    case OrderStatus.READY:
    case OrderStatus.DELIVERED:
      return "success";
    case OrderStatus.CANCELLED:
      return "danger";
    default:
      return "default";
  }
}
