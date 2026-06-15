import { formatTierHint, resolveNextTier, resolveTieredConfig, tierMetric } from "@/lib/promotion-engine/tiers";
import { isPromotionEligible } from "@/lib/promotion-engine/validate";
import type { PromotionDefinition, PromotionHint, PromotionLine } from "@/lib/promotion-engine/types";
import type { OrderChannel } from "@prisma/client";

export function buildPromotionHints(
  promotions: PromotionDefinition[],
  lines: PromotionLine[],
  subtotal: number,
  channel: OrderChannel,
  appliedPromotionIds: Set<string>,
  at = new Date()
): PromotionHint[] {
  const hints: PromotionHint[] = [];

  for (const promotion of promotions) {
    if (promotion.application !== "AUTO") continue;
    if (promotion.kind !== "TIERED_SPEND" && promotion.kind !== "TIERED_QUANTITY") continue;
    if (appliedPromotionIds.has(promotion.id)) continue;
    if (!isPromotionEligible(promotion, subtotal, channel, at)) continue;

    const config = resolveTieredConfig(promotion);
    if (!config || config.tiers.length === 0) continue;

    const metric = tierMetric(promotion, lines, subtotal);
    const nextTier = resolveNextTier(config.tiers, metric);
    if (!nextTier) continue;

    hints.push({
      promotionId: promotion.id,
      name: promotion.name,
      kind: promotion.kind,
      message: formatTierHint(promotion, nextTier, metric),
    });
  }

  return hints;
}
