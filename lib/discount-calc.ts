import type { OrderChannel, OrderPaymentMethod, PromotionApplication, PromotionKind } from "@prisma/client";
import { calculatePromotionAmount } from "@/lib/promotion-engine/calculate";
import type { PromotionSchedule } from "@/lib/promotion-engine/types";
import { isPromotionEligible } from "@/lib/promotion-engine/validate";

export type DiscountLike = {
  kind: PromotionKind;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount?: number | null;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  schedule?: PromotionSchedule | null;
  channels?: OrderChannel[];
  application?: PromotionApplication;
  paymentMethods?: OrderPaymentMethod[];
};

/** @deprecated Use isPromotionEligible from promotion-engine */
export function isDiscountValid(
  discount: DiscountLike,
  subtotal: number,
  channel: OrderChannel = "DINE_IN",
  at = new Date()
): boolean {
  return isPromotionEligible(
    {
      isActive: discount.isActive,
      minOrderAmount: discount.minOrderAmount,
      validFrom: discount.validFrom,
      validTo: discount.validTo,
      schedule: discount.schedule ?? null,
      channels: discount.channels ?? [],
      application: discount.application ?? "CODE",
      paymentMethods: discount.paymentMethods ?? [],
    },
    subtotal,
    channel,
    at
  );
}

/** @deprecated Use calculatePromotionAmount from promotion-engine */
export function calculateDiscountAmount(discount: DiscountLike, subtotal: number): number {
  return calculatePromotionAmount(
    discount.kind,
    discount.value,
    subtotal,
    discount.maxDiscountAmount ?? null
  );
}

export function promotionKindLabel(kind: PromotionKind): string {
  switch (kind) {
    case "CHECK_PERCENT":
      return "Percent off bill";
    case "CHECK_FIXED":
      return "Fixed amount off bill";
    case "ITEM_PERCENT":
      return "Percent off items";
    case "ITEM_FIXED":
      return "Fixed amount off items";
    case "BOGO":
      return "Buy one get one";
    case "COMBO_PRICE":
      return "Combo bundle price";
    case "TIERED_SPEND":
      return "Tiered spend discount";
    case "TIERED_QUANTITY":
      return "Tiered quantity discount";
    case "MANAGER_OPEN":
      return "Manager open discount";
    case "COMP_ITEM":
      return "Comp item";
    case "CUSTOMER_SEGMENT":
      return "Customer segment offer";
    default:
      return kind;
  }
}

export function formatPromotionValue(kind: PromotionKind, value: number): string {
  if (kind === "CHECK_PERCENT" || kind === "ITEM_PERCENT") return `${value}%`;
  if (kind === "BOGO") return `${value}% off get item`;
  if (kind === "COMBO_PRICE") return `₹${value} combo`;
  if (kind === "TIERED_SPEND" || kind === "TIERED_QUANTITY") return "Tiered";
  if (kind === "CUSTOMER_SEGMENT") return `${value}%`;
  return `₹${value}`;
}
