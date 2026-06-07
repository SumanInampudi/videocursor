import { allocatePromotionToLines } from "@/lib/promotion-engine/allocate";
import { customerSegmentMatches } from "@/lib/promotion-engine/segments";
import { pickBestPricePromotion } from "@/lib/promotion-engine/stacking";
import { canApplyTieredPromotion } from "@/lib/promotion-engine/tiers";
import { isPromotionEligible } from "@/lib/promotion-engine/validate";
import type {
  AppliedPromotion,
  PromotionApplyResult,
  PromotionDefinition,
  PromotionEvaluateContext,
  PromotionLine,
} from "@/lib/promotion-engine/types";

function applySinglePromotion(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  orderSubtotal: number,
  channel: import("@prisma/client").OrderChannel,
  at: Date,
  paymentMethod?: import("@prisma/client").OrderPaymentMethod | null
): { error: string } | { nextLines: PromotionLine[]; applied: AppliedPromotion } {
  if (!isPromotionEligible(promotion, orderSubtotal, channel, at, paymentMethod)) {
    return { error: "Discount not valid for this order" };
  }

  const allocated = allocatePromotionToLines(promotion, lines, orderSubtotal);
  if (!allocated) {
    return { error: "Discount does not apply to this order" };
  }

  return { nextLines: allocated.nextLines, applied: allocated.applied };
}

export function applyCodePromotion(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  subtotal: number,
  channel: import("@prisma/client").OrderChannel = "DINE_IN",
  at = new Date(),
  paymentMethod?: import("@prisma/client").OrderPaymentMethod | null
): { error: string } | PromotionApplyResult {
  const result = applySinglePromotion(promotion, lines, subtotal, channel, at, paymentMethod);
  if ("error" in result) return result;

  const discountTotal = result.applied.discountAmount;
  return {
    discountId: promotion.id,
    discountCode: promotion.code,
    discountTotal,
    linePayloads: result.nextLines,
    appliedPromotions: [result.applied],
  };
}

function canAutoPromotionApply(
  promotion: PromotionDefinition,
  lines: PromotionLine[],
  subtotal: number,
  context: PromotionEvaluateContext
): boolean {
  if (promotion.kind === "TIERED_SPEND" || promotion.kind === "TIERED_QUANTITY") {
    return canApplyTieredPromotion(promotion, lines, subtotal);
  }

  if (promotion.kind === "CUSTOMER_SEGMENT") {
    return customerSegmentMatches(
      promotion,
      context.customerSegments ?? [],
      context.deliveredOrderCount ?? 0
    );
  }

  return true;
}

function matchesApplicationWindow(
  promotion: PromotionDefinition,
  paymentMethod?: import("@prisma/client").OrderPaymentMethod | null
): boolean {
  if (promotion.application === "PAYMENT_METHOD") {
    return Boolean(paymentMethod);
  }
  return promotion.application === "AUTO";
}

export function selectAutoPromotions(
  promotions: PromotionDefinition[],
  lines: PromotionLine[],
  subtotal: number,
  context: PromotionEvaluateContext
): PromotionDefinition[] {
  const channel = context.channel;
  const at = context.at ?? new Date();
  const paymentMethod = context.paymentMethod ?? null;

  const eligible = promotions
    .filter(
      (promotion) =>
        promotion.application === "AUTO" || promotion.application === "PAYMENT_METHOD"
    )
    .filter((promotion) => matchesApplicationWindow(promotion, paymentMethod))
    .filter((promotion) =>
      isPromotionEligible(promotion, subtotal, channel, at, paymentMethod)
    )
    .filter((promotion) => canAutoPromotionApply(promotion, lines, subtotal, context))
    .sort((a, b) => a.priority - b.priority);

  const bestPriceCandidates = eligible.filter(
    (promotion) => promotion.stackingPolicy === "BEST_PRICE"
  );
  if (bestPriceCandidates.length > 0) {
    const best = pickBestPricePromotion(
      bestPriceCandidates,
      lines,
      subtotal,
      channel,
      at
    );
    return best ? [best] : [];
  }

  const exclusive = eligible.filter((promotion) => promotion.stackingPolicy === "EXCLUSIVE");
  if (exclusive.length > 0) {
    for (const promotion of exclusive) {
      const allocated = allocatePromotionToLines(promotion, lines, subtotal);
      if (allocated && allocated.discountTotal > 0) {
        return [promotion];
      }
    }
    return [];
  }

  return eligible.filter((promotion) => promotion.stackingPolicy === "STACKABLE");
}

export function applyPromotions(
  promotions: PromotionDefinition[],
  lines: PromotionLine[],
  subtotal: number,
  context: PromotionEvaluateContext
): { error: string } | PromotionApplyResult {
  const channel = context.channel;
  const at = context.at ?? new Date();
  let currentLines = lines.map((line) => ({ ...line }));
  let currentSubtotal = subtotal;
  const applied: AppliedPromotion[] = [];

  const autoPromos = context.includeAuto
    ? selectAutoPromotions(promotions, currentLines, currentSubtotal, context)
    : [];

  const code = context.codes?.map((value) => value.trim().toUpperCase()).find(Boolean);
  const codePromo = code
    ? promotions.find(
        (promotion) =>
          promotion.application === "CODE" && promotion.code.toUpperCase() === code
      )
    : undefined;

  const queue = [...autoPromos, ...(codePromo ? [codePromo] : [])];

  for (const promotion of queue) {
    if (
      promotion.kind === "CUSTOMER_SEGMENT" &&
      !customerSegmentMatches(
        promotion,
        context.customerSegments ?? [],
        context.deliveredOrderCount ?? 0
      )
    ) {
      if (promotion.application === "CODE") {
        return { error: "Discount not valid for this customer" };
      }
      continue;
    }

    const result = applySinglePromotion(
      promotion,
      currentLines,
      currentSubtotal,
      channel,
      at,
      context.paymentMethod
    );
    if ("error" in result) {
      if (promotion.application === "CODE") return { error: result.error };
      continue;
    }

    currentLines = result.nextLines;
    currentSubtotal = currentLines.reduce((sum, line) => sum + line.revenue, 0);
    applied.push(result.applied);
  }

  const discountTotal = applied.reduce((sum, row) => sum + row.discountAmount, 0);
  const primaryCode = applied.find((row) => row.code)?.code ?? null;
  const primaryId = applied[0]?.discountId ?? null;

  return {
    discountId: primaryId,
    discountCode: primaryCode,
    discountTotal: Math.round(discountTotal * 100) / 100,
    linePayloads: currentLines,
    appliedPromotions: applied,
  };
}

export function emptyPromotionResult(lines: PromotionLine[]): PromotionApplyResult {
  return {
    discountId: null,
    discountCode: null,
    discountTotal: 0,
    linePayloads: lines.map((line) => ({ ...line })),
    appliedPromotions: [],
  };
}
