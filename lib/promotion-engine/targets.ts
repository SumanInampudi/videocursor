import type { PromotionLine, PromotionTargetDef } from "@/lib/promotion-engine/types";
import type { PromotionTargetRole } from "@prisma/client";

export function targetsForRole(
  targets: PromotionTargetDef[],
  role: PromotionTargetRole
): PromotionTargetDef[] {
  const matching = targets.filter((target) => target.role === role);
  if (matching.length > 0) return matching;

  if (role === "BUY" || role === "GET" || role === "BUNDLE_MEMBER") {
    const applyTo = targets.filter((target) => target.role === "APPLY_TO");
    if (applyTo.length > 0) return applyTo;
  }

  return targets;
}

export function lineMatchesTargets(line: PromotionLine, targets: PromotionTargetDef[]): boolean {
  if (targets.length === 0) return true;

  return targets.some((target) => {
    if (target.targetType === "ALL_PRODUCTS") return true;
    if (target.targetType === "PRODUCT") {
      return target.productId != null && target.productId === line.productId;
    }
    if (target.targetType === "CATEGORY") {
      return (
        target.category != null &&
        target.category.trim().toLowerCase() === line.category.trim().toLowerCase()
      );
    }
    return false;
  });
}

export function eligibleLines(
  lines: PromotionLine[],
  targets: PromotionTargetDef[]
): PromotionLine[] {
  return lines.filter((line) => !line.isIncluded && lineMatchesTargets(line, targets));
}

export function eligibleSubtotal(lines: PromotionLine[]): number {
  return lines.reduce((sum, line) => sum + line.revenue, 0);
}
