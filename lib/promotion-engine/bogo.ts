import { eligibleLines, targetsForRole } from "@/lib/promotion-engine/targets";
import type { BogoConfig, PromotionDefinition, PromotionLine } from "@/lib/promotion-engine/types";

type UnitSlot = {
  productId: string;
  unitPrice: number;
};

function expandUnits(lines: PromotionLine[]): UnitSlot[] {
  const units: UnitSlot[] = [];
  for (const line of lines) {
    if (line.isIncluded) continue;
    for (let index = 0; index < line.quantity; index++) {
      units.push({ productId: line.productId, unitPrice: line.unitSalePrice });
    }
  }
  return units;
}

export function resolveBogoConfig(promotion: PromotionDefinition): BogoConfig {
  return (
    promotion.bogoConfig ?? {
      buyQuantity: 1,
      getQuantity: 1,
      getDiscountPercent: promotion.value,
      applyToCheapest: true,
    }
  );
}

export function calculateBogoDiscount(
  lines: PromotionLine[],
  promotion: PromotionDefinition
): { discountTotal: number; lineDiscounts: Map<string, number> } | null {
  const config = resolveBogoConfig(promotion);
  if (config.buyQuantity <= 0 || config.getQuantity <= 0 || config.getDiscountPercent <= 0) {
    return null;
  }

  const buyTargets = targetsForRole(promotion.targets, "BUY");
  const buyLines = eligibleLines(lines, buyTargets);
  const units = expandUnits(buyLines);
  const setSize = config.buyQuantity + config.getQuantity;

  if (units.length < setSize) return null;

  units.sort((left, right) =>
    config.applyToCheapest ? left.unitPrice - right.unitPrice : right.unitPrice - left.unitPrice
  );

  const completeSets = Math.floor(units.length / setSize);
  if (completeSets <= 0) return null;

  const lineDiscounts = new Map<string, number>();
  let discountTotal = 0;

  for (let setIndex = 0; setIndex < completeSets; setIndex++) {
    const slice = units.slice(setIndex * setSize, setIndex * setSize + setSize);
    const getUnits = slice.slice(config.buyQuantity);
    for (const unit of getUnits) {
      const amount =
        Math.round(unit.unitPrice * (config.getDiscountPercent / 100) * 100) / 100;
      discountTotal += amount;
      lineDiscounts.set(unit.productId, (lineDiscounts.get(unit.productId) ?? 0) + amount);
    }
  }

  discountTotal = Math.round(discountTotal * 100) / 100;
  if (discountTotal <= 0) return null;

  if (promotion.maxDiscountAmount != null && promotion.maxDiscountAmount > 0) {
    const cap = promotion.maxDiscountAmount;
    if (discountTotal > cap) {
      const ratio = cap / discountTotal;
      discountTotal = cap;
      for (const [productId, amount] of lineDiscounts) {
        lineDiscounts.set(productId, Math.round(amount * ratio * 100) / 100);
      }
    }
  }

  return { discountTotal, lineDiscounts };
}

export function applyBogoToLines(
  promotion: PromotionDefinition,
  lines: PromotionLine[]
): { discountTotal: number; nextLines: PromotionLine[]; lineDiscounts: Map<string, number> } | null {
  const calculated = calculateBogoDiscount(lines, promotion);
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
