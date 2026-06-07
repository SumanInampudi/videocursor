import { calculateFromDefinition } from "@/lib/promotion-engine/calculate";
import type { PromotionDefinition } from "@/lib/promotion-engine/types";

export type PromotionImpactEstimate = {
  avgOrderValue: number;
  grossMarginRate: number;
  sampleOrderCount: number;
  discountPerOrder: number;
  grossProfitPerOrder: number;
  profitAfterDiscountPerOrder: number;
  weeklyUses: number;
  weeklyDiscountCost: number;
  weeklyBreakEvenRevenue: number;
  monthlyDiscountCost: number;
  monthlyBreakEvenRevenue: number;
};

export type PromotionImpactAtUses = {
  uses: number;
  totalDiscountCost: number;
  totalProfitLost: number;
  breakEvenExtraRevenue: number;
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

  const margin = input.grossMarginRate > 0 ? input.grossMarginRate : 0.01;
  const grossProfitPerOrder = eligibleSubtotal * margin;
  const profitAfterDiscountPerOrder = Math.max(0, grossProfitPerOrder - discountPerOrder);

  const weeklyDiscountCost = discountPerOrder * input.expectedWeeklyRedemptions;
  const weeklyBreakEvenRevenue = weeklyDiscountCost / margin;

  return {
    avgOrderValue: input.avgOrderValue,
    grossMarginRate: input.grossMarginRate,
    sampleOrderCount: input.sampleOrderCount,
    discountPerOrder,
    grossProfitPerOrder: Math.round(grossProfitPerOrder * 100) / 100,
    profitAfterDiscountPerOrder: Math.round(profitAfterDiscountPerOrder * 100) / 100,
    weeklyUses: input.expectedWeeklyRedemptions,
    weeklyDiscountCost: Math.round(weeklyDiscountCost * 100) / 100,
    weeklyBreakEvenRevenue: Math.round(weeklyBreakEvenRevenue * 100) / 100,
    monthlyDiscountCost: Math.round(weeklyDiscountCost * 4.33 * 100) / 100,
    monthlyBreakEvenRevenue: Math.round(weeklyBreakEvenRevenue * 4.33 * 100) / 100,
  };
}

/** Cost and break-even for an arbitrary number of redemptions. */
export function estimateImpactAtUses(input: {
  discountPerOrder: number;
  grossMarginRate: number;
  uses: number;
}): PromotionImpactAtUses {
  const margin = input.grossMarginRate > 0 ? input.grossMarginRate : 0.01;
  const totalDiscountCost = input.discountPerOrder * input.uses;
  return {
    uses: input.uses,
    totalDiscountCost: Math.round(totalDiscountCost * 100) / 100,
    totalProfitLost: Math.round(totalDiscountCost * 100) / 100,
    breakEvenExtraRevenue: Math.round((totalDiscountCost / margin) * 100) / 100,
  };
}
