import type { OrderPaymentMethod } from "@prisma/client";

export const ORDER_PAYMENT_METHODS = ["CASH", "CARD", "PHONEPE"] as const satisfies readonly OrderPaymentMethod[];

export type PosPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PosPaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  PHONEPE: "PhonePe",
};

export const PAYMENT_METHOD_HINTS: Record<PosPaymentMethod, string> = {
  CASH: "Paid with cash at register",
  CARD: "Debit / credit card",
  PHONEPE: "UPI via PhonePe",
};

export function formatPaymentMethod(method: OrderPaymentMethod | string | null | undefined): string {
  if (!method) return "Unpaid";
  return PAYMENT_METHOD_LABELS[method as PosPaymentMethod] ?? method;
}
