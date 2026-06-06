import { applyBogoToLines } from "@/lib/promotion-engine/bogo";
import { applyComboToLines } from "@/lib/promotion-engine/combo";
import { calculateFromDefinition } from "@/lib/promotion-engine/calculate";
import { calculateTieredDiscount } from "@/lib/promotion-engine/tiers";
import { eligibleLines, eligibleSubtotal } from "@/lib/promotion-engine/targets";
import type { AppliedPromotion, PromotionDefinition, PromotionLine } from "@/lib/promotion-engine/types";

function distributeDiscount(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  discountTotal: number,
  affected: PromotionLine[]
): { nextLines: PromotionLine[]; lineAllocations: AppliedPromotion["lineAllocations"] } {
  const nextLines = lines.map((line) => ({ ...line }));
  const affectedSubtotal = eligibleSubtotal(affected);
  const lineAllocations: AppliedPromotion["lineAllocations"] = [];

  for (const line of nextLines) {
    const isAffected = affected.some((row) => row.productId === line.productId);
    if (!isAffected || affectedSubtotal <= 0) {
      lineAllocations.push({
        productId: line.productId,
        discountAmount: 0,
        grossRevenue: line.revenue,
        netRevenue: line.revenue,
      });
      continue;
    }

    const grossRevenue = line.revenue;
    const share = grossRevenue / affectedSubtotal;
    const lineDiscount = Math.round(discountTotal * share * 100) / 100;
    const netRevenue = Math.round((grossRevenue - lineDiscount) * 100) / 100;
    line.revenue = netRevenue;
    lineAllocations.push({
      productId: line.productId,
      discountAmount: lineDiscount,
      grossRevenue,
      netRevenue,
    });
  }

  const allocatedSum = lineAllocations.reduce((sum, row) => sum + row.discountAmount, 0);
  const roundingDrift = Math.round((discountTotal - allocatedSum) * 100) / 100;
  if (roundingDrift !== 0) {
    const firstAffected = lineAllocations.find((row) => row.discountAmount > 0);
    if (firstAffected) {
      firstAffected.discountAmount =
        Math.round((firstAffected.discountAmount + roundingDrift) * 100) / 100;
      firstAffected.netRevenue =
        Math.round((firstAffected.grossRevenue - firstAffected.discountAmount) * 100) / 100;
      const line = nextLines.find((row) => row.productId === firstAffected.productId);
      if (line) line.revenue = firstAffected.netRevenue;
    }
  }

  return { nextLines, lineAllocations };
}

function buildApplied(
  promotion: PromotionDefinition,
  discountTotal: number,
  lineAllocations: AppliedPromotion["lineAllocations"]
): AppliedPromotion {
  return {
    discountId: promotion.id,
    code: promotion.application === "CODE" ? promotion.code : null,
    name: promotion.name,
    kind: promotion.kind,
    discountAmount: discountTotal,
    lineAllocations,
    configSnapshot: {
      value: promotion.value,
      minOrderAmount: promotion.minOrderAmount,
      maxDiscountAmount: promotion.maxDiscountAmount,
      targets: promotion.targets,
      application: promotion.application,
      bogoConfig: promotion.bogoConfig,
      comboConfig: promotion.comboConfig,
      tieredConfig: promotion.tieredConfig,
    },
  };
}

function buildAppliedWithTier(
  promotion: PromotionDefinition,
  discountTotal: number,
  lineAllocations: AppliedPromotion["lineAllocations"],
  tier: import("@/lib/promotion-engine/types").PromotionTierDef
): AppliedPromotion {
  const applied = buildApplied(promotion, discountTotal, lineAllocations);
  applied.configSnapshot = { ...applied.configSnapshot, matchedTier: tier };
  return applied;
}

function allocateFromLineDiscounts(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  discountTotal: number,
  lineDiscounts: Map<string, number>
): { discountTotal: number; nextLines: PromotionLine[]; applied: AppliedPromotion } {
  const nextLines = lines.map((line) => ({ ...line }));
  const lineAllocations: AppliedPromotion["lineAllocations"] = nextLines.map((line) => {
    const lineDiscount = lineDiscounts.get(line.productId) ?? 0;
    const grossRevenue = line.revenue + lineDiscount;
    return {
      productId: line.productId,
      discountAmount: lineDiscount,
      grossRevenue,
      netRevenue: line.revenue,
    };
  });

  return {
    discountTotal,
    nextLines,
    applied: buildApplied(promotion, discountTotal, lineAllocations),
  };
}

export function allocatePromotionToLines(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  orderSubtotal: number
): { discountTotal: number; nextLines: PromotionLine[]; applied: AppliedPromotion } | null {
  if (promotion.kind === "BOGO") {
    const bogo = applyBogoToLines(promotion, lines);
    if (!bogo) return null;
    return allocateFromLineDiscounts(promotion, bogo.nextLines, bogo.discountTotal, bogo.lineDiscounts);
  }

  if (promotion.kind === "COMBO_PRICE") {
    const combo = applyComboToLines(promotion, lines);
    if (!combo) return null;
    return allocateFromLineDiscounts(promotion, combo.nextLines, combo.discountTotal, combo.lineDiscounts);
  }

  if (promotion.kind === "TIERED_SPEND" || promotion.kind === "TIERED_QUANTITY") {
    const tiered = calculateTieredDiscount(promotion, lines, orderSubtotal);
    if (!tiered) return null;

    const hasTargets = promotion.targets.length > 0 && promotion.kind !== "TIERED_QUANTITY";
    const affected = hasTargets ? eligibleLines(lines, promotion.targets) : lines;
    const { nextLines, lineAllocations } = distributeDiscount(
      promotion,
      lines,
      tiered.discountTotal,
      affected
    );

    return {
      discountTotal: tiered.discountTotal,
      nextLines,
      applied: buildAppliedWithTier(promotion, tiered.discountTotal, lineAllocations, tiered.tier),
    };
  }

  const isItemLevel = promotion.kind === "ITEM_PERCENT" || promotion.kind === "ITEM_FIXED";
  const affected = isItemLevel ? eligibleLines(lines, promotion.targets) : lines;
  const basisSubtotal = isItemLevel ? eligibleSubtotal(affected) : orderSubtotal;

  if (basisSubtotal <= 0 || affected.length === 0) return null;

  let discountTotal = 0;
  if (promotion.kind === "CUSTOMER_SEGMENT") {
    const valueType = promotion.customerSegmentConfig?.valueType ?? "PERCENT";
    const kind = valueType === "FIXED" ? "CHECK_FIXED" : "CHECK_PERCENT";
    discountTotal = calculateFromDefinition(
      { kind, value: promotion.value, maxDiscountAmount: promotion.maxDiscountAmount },
      basisSubtotal
    );
  } else {
    discountTotal = calculateFromDefinition(promotion, basisSubtotal);
  }
  if (discountTotal <= 0) return null;

  const { nextLines, lineAllocations } = distributeDiscount(
    promotion,
    lines,
    discountTotal,
    affected
  );

  return {
    discountTotal,
    nextLines,
    applied: buildApplied(promotion, discountTotal, lineAllocations),
  };
}

/** @deprecated use allocatePromotionToLines */
export const allocateCheckPromotionToLines = allocatePromotionToLines;
