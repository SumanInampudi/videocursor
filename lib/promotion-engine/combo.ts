import { targetsForRole } from "@/lib/promotion-engine/targets";
import type { PromotionDefinition, PromotionLine } from "@/lib/promotion-engine/types";

export function resolveComboPrice(promotion: PromotionDefinition): number {
  return promotion.comboConfig?.comboPrice ?? promotion.value;
}

export function calculateComboDiscount(
  lines: PromotionLine[],
  promotion: PromotionDefinition
): { discountTotal: number; lineDiscounts: Map<string, number> } | null {
  const memberTargets = targetsForRole(promotion.targets, "BUNDLE_MEMBER").filter(
    (target) => target.targetType === "PRODUCT" && target.productId
  );
  if (memberTargets.length < 2) return null;

  const memberProductIds = memberTargets.map((target) => target.productId!);
  const memberLines = lines.filter((line) => memberProductIds.includes(line.productId));
  if (memberLines.length !== memberProductIds.length) return null;

  const comboCount = Math.min(...memberLines.map((line) => line.quantity));
  if (comboCount <= 0) return null;

  const bundleUnitTotal = memberLines.reduce((sum, line) => sum + line.unitSalePrice, 0);
  const comboPrice = resolveComboPrice(promotion);
  const discountPerCombo = Math.max(0, bundleUnitTotal - comboPrice);
  if (discountPerCombo <= 0) return null;

  let discountTotal = Math.round(discountPerCombo * comboCount * 100) / 100;
  if (promotion.maxDiscountAmount != null && promotion.maxDiscountAmount > 0) {
    discountTotal = Math.min(discountTotal, promotion.maxDiscountAmount);
  }
  if (discountTotal <= 0) return null;

  const lineDiscounts = new Map<string, number>();
  for (const line of memberLines) {
    const share = line.unitSalePrice / bundleUnitTotal;
    const lineDiscount = Math.round(discountTotal * share * 100) / 100;
    lineDiscounts.set(line.productId, lineDiscount);
  }

  const allocated = [...lineDiscounts.values()].reduce((sum, value) => sum + value, 0);
  const drift = Math.round((discountTotal - allocated) * 100) / 100;
  if (drift !== 0) {
    const first = memberLines[0]!;
    lineDiscounts.set(
      first.productId,
      Math.round(((lineDiscounts.get(first.productId) ?? 0) + drift) * 100) / 100
    );
  }

  return { discountTotal, lineDiscounts };
}

export function applyComboToLines(
  promotion: PromotionDefinition,
  lines: PromotionLine[]
): { discountTotal: number; nextLines: PromotionLine[]; lineDiscounts: Map<string, number> } | null {
  const calculated = calculateComboDiscount(lines, promotion);
  if (!calculated) return null;

  const nextLines = lines.map((line) => ({ ...line }));
  for (const line of nextLines) {
    const lineDiscount = calculated.lineDiscounts.get(line.productId) ?? 0;
    if (lineDiscount > 0) {
      line.revenue = Math.round((line.revenue - lineDiscount) * 100) / 100;
    }
  }

  return {
    discountTotal: calculated.discountTotal,
    nextLines,
    lineDiscounts: calculated.lineDiscounts,
  };
}
