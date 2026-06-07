import { isWithinSchedule } from "@/lib/promotion-engine/schedule";
import type { PromotionDefinition } from "@/lib/promotion-engine/types";
import type { OrderChannel, OrderPaymentMethod } from "@prisma/client";

export function isPromotionEligible(
  promotion: Pick<
    PromotionDefinition,
    | "isActive"
    | "minOrderAmount"
    | "validFrom"
    | "validTo"
    | "schedule"
    | "channels"
    | "paymentMethods"
    | "application"
  >,
  subtotal: number,
  channel: OrderChannel,
  at = new Date(),
  paymentMethod?: OrderPaymentMethod | null
): boolean {
  if (!promotion.isActive) return false;
  if (promotion.minOrderAmount != null && subtotal < promotion.minOrderAmount) {
    return false;
  }

  if (promotion.channels.length > 0 && !promotion.channels.includes(channel)) {
    return false;
  }

  const day = at.toISOString().slice(0, 10);
  if (promotion.validFrom) {
    const from = promotion.validFrom.toISOString().slice(0, 10);
    if (day < from) return false;
  }
  if (promotion.validTo) {
    const to = promotion.validTo.toISOString().slice(0, 10);
    if (day > to) return false;
  }

  if (!isWithinSchedule(promotion.schedule, at)) {
    return false;
  }

  if (promotion.application === "PAYMENT_METHOD") {
    if (!paymentMethod) return false;
    if (
      promotion.paymentMethods.length > 0 &&
      !promotion.paymentMethods.includes(paymentMethod)
    ) {
      return false;
    }
  } else if (promotion.paymentMethods.length > 0 && paymentMethod) {
    // AUTO/CODE: payment filter applies only once payment is known (checkout/settle).
    if (!promotion.paymentMethods.includes(paymentMethod)) {
      return false;
    }
  }

  return true;
}
