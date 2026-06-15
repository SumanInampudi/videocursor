import { allocatePromotionToLines } from "@/lib/promotion-engine/allocate";
import { isPromotionEligible } from "@/lib/promotion-engine/validate";
import type { PromotionDefinition, PromotionLine } from "@/lib/promotion-engine/types";
import type { OrderChannel } from "@prisma/client";

export function pickBestPricePromotion(
  promotions: PromotionDefinition[],
  lines: PromotionLine[],
  subtotal: number,
  channel: OrderChannel,
  at: Date
): PromotionDefinition | null {
  let best: { promotion: PromotionDefinition; discount: number } | null = null;

  for (const promotion of promotions) {
    if (!isPromotionEligible(promotion, subtotal, channel, at)) continue;
    const allocated = allocatePromotionToLines(promotion, lines, subtotal);
    if (!allocated || allocated.discountTotal <= 0) continue;

    if (!best || allocated.discountTotal > best.discount) {
      best = { promotion, discount: allocated.discountTotal };
    }
  }

  return best?.promotion ?? null;
}
