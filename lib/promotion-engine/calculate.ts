import type { PromotionDefinition } from "@/lib/promotion-engine/types";
import type { PromotionKind } from "@prisma/client";

export function calculatePromotionAmount(
  kind: PromotionKind,
  value: number,
  subtotal: number,
  maxDiscountAmount: number | null = null
): number {
  if (subtotal <= 0 || value <= 0) return 0;

  let amount = 0;
  if (kind === "CHECK_PERCENT" || kind === "ITEM_PERCENT") {
    amount = (subtotal * value) / 100;
  } else if (kind === "CHECK_FIXED" || kind === "ITEM_FIXED") {
    amount = value;
  }

  amount = Math.min(subtotal, amount);
  if (maxDiscountAmount != null && maxDiscountAmount > 0) {
    amount = Math.min(amount, maxDiscountAmount);
  }

  return Math.round(amount * 100) / 100;
}

export function calculateFromDefinition(
  promotion: Pick<PromotionDefinition, "kind" | "value" | "maxDiscountAmount">,
  subtotal: number
): number {
  return calculatePromotionAmount(
    promotion.kind,
    promotion.value,
    subtotal,
    promotion.maxDiscountAmount
  );
}
