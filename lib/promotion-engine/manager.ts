import { calculatePromotionAmount } from "@/lib/promotion-engine/calculate";
import type {
  AppliedPromotion,
  CompLineInput,
  ManagerAdjustmentsInput,
  ManagerOpenDiscountInput,
  PromotionLine,
} from "@/lib/promotion-engine/types";

export const MANAGER_DISCOUNT_LIMITS = {
  maxAmount: 500,
  maxPercent: 25,
};

export function normalizeManagerOpenDiscount(
  input: ManagerOpenDiscountInput,
  basisSubtotal: number
): { amount: number; error?: string } {
  const reason = input.reason.trim();
  if (!reason) return { amount: 0, error: "Reason is required for manager discounts" };
  if (input.value <= 0) return { amount: 0, error: "Discount value must be greater than 0" };
  if (basisSubtotal <= 0) return { amount: 0, error: "Nothing left to discount" };

  let amount = 0;
  if (input.mode === "PERCENT") {
    if (input.value > MANAGER_DISCOUNT_LIMITS.maxPercent) {
      return {
        amount: 0,
        error: `Manager discount cannot exceed ${MANAGER_DISCOUNT_LIMITS.maxPercent}%`,
      };
    }
    amount = calculatePromotionAmount("CHECK_PERCENT", input.value, basisSubtotal);
  } else {
    amount = Math.min(input.value, basisSubtotal);
    if (amount > MANAGER_DISCOUNT_LIMITS.maxAmount) {
      return {
        amount: 0,
        error: `Manager discount cannot exceed ₹${MANAGER_DISCOUNT_LIMITS.maxAmount}`,
      };
    }
  }

  return { amount: Math.round(amount * 100) / 100 };
}

function distributeManagerDiscount(
  lines: PromotionLine[],
  discountTotal: number
): { nextLines: PromotionLine[]; lineAllocations: AppliedPromotion["lineAllocations"] } {
  const nextLines = lines.map((line) => ({ ...line }));
  const subtotal = nextLines.reduce((sum, line) => sum + line.revenue, 0);
  const lineAllocations: AppliedPromotion["lineAllocations"] = [];

  for (const line of nextLines) {
    if (subtotal <= 0) {
      lineAllocations.push({
        productId: line.productId,
        discountAmount: 0,
        grossRevenue: line.revenue,
        netRevenue: line.revenue,
      });
      continue;
    }

    const grossRevenue = line.revenue;
    const share = grossRevenue / subtotal;
    const lineDiscount = Math.round(discountTotal * share * 100) / 100;
    line.revenue = Math.round((grossRevenue - lineDiscount) * 100) / 100;
    lineAllocations.push({
      productId: line.productId,
      discountAmount: lineDiscount,
      grossRevenue,
      netRevenue: line.revenue,
    });
  }

  return { nextLines, lineAllocations };
}

function applyCompLines(
  lines: PromotionLine[],
  compLines: CompLineInput[]
): {
  nextLines: PromotionLine[];
  applied: AppliedPromotion[];
} {
  const nextLines = lines.map((line) => ({ ...line }));
  const applied: AppliedPromotion[] = [];

  for (const comp of compLines) {
    const reason = comp.reason.trim();
    if (!reason) continue;

    const line = nextLines.find((row) => row.productId === comp.productId);
    if (!line || line.revenue <= 0) continue;

    const discountAmount = line.revenue;
    const grossRevenue = line.revenue;
    line.revenue = 0;

    applied.push({
      discountId: null,
      code: null,
      name: `Comp · ${line.productName}`,
      kind: "COMP_ITEM",
      discountAmount,
      reason,
      lineAllocations: [
        {
          productId: line.productId,
          discountAmount,
          grossRevenue,
          netRevenue: 0,
        },
      ],
      configSnapshot: {
        productId: line.productId,
        productName: line.productName,
        reason,
      },
    });
  }

  return { nextLines, applied };
}

export function applyManagerAdjustments(
  lines: PromotionLine[],
  adjustments: ManagerAdjustmentsInput,
  appliedByUserId: string | null = null
): { error: string } | { nextLines: PromotionLine[]; applied: AppliedPromotion[] } {
  let currentLines = lines.map((line) => ({ ...line }));
  const applied: AppliedPromotion[] = [];

  if (adjustments.compLines?.length) {
    const compResult = applyCompLines(currentLines, adjustments.compLines);
    currentLines = compResult.nextLines;
    applied.push(
      ...compResult.applied.map((row) => ({
        ...row,
        appliedByUserId,
      }))
    );
  }

  if (adjustments.openDiscount) {
    const basisSubtotal = currentLines.reduce((sum, line) => sum + line.revenue, 0);
    const normalized = normalizeManagerOpenDiscount(adjustments.openDiscount, basisSubtotal);
    if (normalized.error) return { error: normalized.error };
    if (normalized.amount > 0) {
      const { nextLines, lineAllocations } = distributeManagerDiscount(
        currentLines,
        normalized.amount
      );
      currentLines = nextLines;
      applied.push({
        discountId: null,
        code: null,
        name: "Manager discount",
        kind: "MANAGER_OPEN",
        discountAmount: normalized.amount,
        reason: adjustments.openDiscount.reason.trim(),
        appliedByUserId,
        lineAllocations,
        configSnapshot: {
          mode: adjustments.openDiscount.mode,
          value: adjustments.openDiscount.value,
          reason: adjustments.openDiscount.reason.trim(),
        },
      });
    }
  }

  return { nextLines: currentLines, applied };
}

export function previewManagerAdjustmentsTotal(
  lines: PromotionLine[],
  adjustments: ManagerAdjustmentsInput
): number {
  const result = applyManagerAdjustments(lines, adjustments);
  if ("error" in result) return 0;
  return result.applied.reduce((sum, row) => sum + row.discountAmount, 0);
}

export function parseCompLinesJson(raw: string | undefined): CompLineInput[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as CompLineInput[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        productId: String(row.productId ?? "").trim(),
        reason: String(row.reason ?? "").trim(),
      }))
      .filter((row) => row.productId && row.reason);
  } catch {
    return [];
  }
}

export function parseManagerAdjustmentsFromForm(raw: {
  managerDiscountMode?: string;
  managerDiscountValue?: string | number;
  managerDiscountReason?: string;
  compLinesJson?: string;
}): ManagerAdjustmentsInput {
  const compLines = parseCompLinesJson(raw.compLinesJson);
  const mode = raw.managerDiscountMode === "PERCENT" ? "PERCENT" : "FIXED";
  const value = Number(raw.managerDiscountValue ?? 0);
  const reason = String(raw.managerDiscountReason ?? "").trim();

  const openDiscount =
    value > 0 && reason
      ? {
          mode: mode as "FIXED" | "PERCENT",
          value,
          reason,
        }
      : undefined;

  return {
    openDiscount,
    compLines: compLines.length > 0 ? compLines : undefined,
  };
}

export function hasManagerAdjustments(adjustments: ManagerAdjustmentsInput): boolean {
  return Boolean(adjustments.openDiscount || adjustments.compLines?.length);
}

export function serializeManagerAdjustmentsForForm(adjustments: ManagerAdjustmentsInput): {
  managerDiscountMode?: string;
  managerDiscountValue?: string;
  managerDiscountReason?: string;
  compLinesJson?: string;
} {
  if (!hasManagerAdjustments(adjustments)) return {};

  return {
    managerDiscountMode: adjustments.openDiscount?.mode,
    managerDiscountValue:
      adjustments.openDiscount != null ? String(adjustments.openDiscount.value) : undefined,
    managerDiscountReason: adjustments.openDiscount?.reason,
    compLinesJson: adjustments.compLines?.length
      ? JSON.stringify(adjustments.compLines)
      : undefined,
  };
}
