import { calculateFromDefinition } from "@/lib/promotion-engine/calculate";
import type { PromotionDefinition } from "@/lib/promotion-engine/types";

export type PromotionImpactEstimate = {
  avgOrderValue: number;
  grossMarginRate: number;
  sampleOrderCount: number;
  discountPerOrder: number;
  weeklyUses: number;
  weeklyDiscountCost: number;
  weeklyBreakEvenRevenue: number;
  monthlyDiscountCost: number;
  monthlyBreakEvenRevenue: number;
};

export function estimatePromotionImpact(input: {
  promotion: Pick<
    PromotionDefinition,
    "kind" | "value" | "minOrderAmount" | "maxDiscountAmount"
  >;
  avgOrderValue: number;
  grossMarginRate: number;
  expectedWeeklyRedemptions: number;
  sampleOrderCount: number;
}): PromotionImpactEstimate {
  const eligibleSubtotal = Math.max(
    input.avgOrderValue,
    input.promotion.minOrderAmount ?? 0
  );
  const discountPerOrder = calculateFromDefinition(
    {
      kind: input.promotion.kind,
      value: input.promotion.value,
      maxDiscountAmount: input.promotion.maxDiscountAmount,
    },
    eligibleSubtotal
  );

  const weeklyDiscountCost = discountPerOrder * input.expectedWeeklyRedemptions;
  const margin = input.grossMarginRate > 0 ? input.grossMarginRate : 0.01;
  const weeklyBreakEvenRevenue = weeklyDiscountCost / margin;

  return {
    avgOrderValue: input.avgOrderValue,
    grossMarginRate: input.grossMarginRate,
    sampleOrderCount: input.sampleOrderCount,
    discountPerOrder,
    weeklyUses: input.expectedWeeklyRedemptions,
    weeklyDiscountCost: Math.round(weeklyDiscountCost * 100) / 100,
    weeklyBreakEvenRevenue: Math.round(weeklyBreakEvenRevenue * 100) / 100,
    monthlyDiscountCost: Math.round(weeklyDiscountCost * 4.33 * 100) / 100,
    monthlyBreakEvenRevenue: Math.round(weeklyBreakEvenRevenue * 4.33 * 100) / 100,
  };
}
