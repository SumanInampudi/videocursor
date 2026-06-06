import { calculatePromotionAmount } from "@/lib/promotion-engine/calculate";
import { eligibleLines, eligibleSubtotal } from "@/lib/promotion-engine/targets";
import type {
  PromotionDefinition,
  PromotionLine,
  PromotionTierDef,
  TieredConfig,
} from "@/lib/promotion-engine/types";

export function resolveTieredConfig(promotion: PromotionDefinition): TieredConfig | null {
  return promotion.tieredConfig;
}

function tierThreshold(tier: PromotionTierDef): number {
  return tier.thresholdAmount ?? tier.thresholdQty ?? 0;
}

export function resolveBestTier(
  tiers: PromotionTierDef[],
  metric: number
): PromotionTierDef | null {
  const qualifying = tiers
    .filter((tier) => metric >= tierThreshold(tier))
    .sort((left, right) => tierThreshold(right) - tierThreshold(left));
  return qualifying[0] ?? null;
}

export function resolveNextTier(
  tiers: PromotionTierDef[],
  metric: number
): PromotionTierDef | null {
  const upcoming = tiers
    .filter((tier) => metric < tierThreshold(tier))
    .sort((left, right) => tierThreshold(left) - tierThreshold(right));
  return upcoming[0] ?? null;
}

export function tierMetric(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  orderSubtotal: number
): number {
  const hasTargets = promotion.targets.length > 0;
  if (promotion.kind === "TIERED_QUANTITY") {
    const affected = hasTargets ? eligibleLines(lines, promotion.targets) : lines;
    return affected.reduce((sum, line) => sum + line.quantity, 0);
  }

  if (hasTargets) {
    return eligibleSubtotal(eligibleLines(lines, promotion.targets));
  }
  return orderSubtotal;
}

export function calculateTierDiscount(
  promotion: PromotionDefinition,
  tier: PromotionTierDef,
  basisSubtotal: number
): number {
  const kind = tier.valueType === "PERCENT" ? "CHECK_PERCENT" : "CHECK_FIXED";
  return calculatePromotionAmount(kind, tier.value, basisSubtotal, promotion.maxDiscountAmount);
}

export function calculateTieredDiscount(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  orderSubtotal: number
): { discountTotal: number; tier: PromotionTierDef; basisSubtotal: number } | null {
  const config = resolveTieredConfig(promotion);
  if (!config || config.tiers.length === 0) return null;

  const metric = tierMetric(promotion, lines, orderSubtotal);
  const tier = resolveBestTier(config.tiers, metric);
  if (!tier) return null;

  const hasTargets = promotion.targets.length > 0;
  const affected =
    hasTargets && promotion.kind !== "TIERED_QUANTITY"
      ? eligibleLines(lines, promotion.targets)
      : lines;
  const basisSubtotal =
    hasTargets && promotion.kind !== "TIERED_QUANTITY"
      ? eligibleSubtotal(affected)
      : orderSubtotal;

  if (basisSubtotal <= 0) return null;

  const discountTotal = calculateTierDiscount(promotion, tier, basisSubtotal);
  if (discountTotal <= 0) return null;

  return { discountTotal, tier, basisSubtotal };
}

export function formatTierReward(tier: PromotionTierDef): string {
  return tier.valueType === "PERCENT" ? `${tier.value}% off` : `₹${tier.value} off`;
}

export function canApplyTieredPromotion(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  orderSubtotal: number
): boolean {
  return calculateTieredDiscount(promotion, lines, orderSubtotal) != null;
}

export function formatTierHint(
  promotion: PromotionDefinition,
  nextTier: PromotionTierDef,
  metric: number
): string {
  const gap = Math.max(0, Math.ceil(tierThreshold(nextTier) - metric));
  const reward = formatTierReward(nextTier);

  if (promotion.kind === "TIERED_SPEND") {
    return `Add ₹${gap} more for ${reward}`;
  }
  return `Add ${gap} more item${gap === 1 ? "" : "s"} for ${reward}`;
}
