import type { PromotionDefinition } from "@/lib/promotion-engine/types";

export const CUSTOMER_SEGMENTS = ["FIRST_ORDER", "BIRTHDAY_MONTH", "RETURNING"] as const;
export type CustomerSegmentType = (typeof CUSTOMER_SEGMENTS)[number];

export type CustomerSegmentConfig = {
  segment: CustomerSegmentType;
  minVisitCount?: number;
  valueType?: "PERCENT" | "FIXED";
};

export function parseCustomerSegmentConfig(
  configJson: unknown,
  value: number
): CustomerSegmentConfig | null {
  if (!configJson || typeof configJson !== "object") return null;
  const row = configJson as Record<string, unknown>;
  const segment = row.segment;
  if (segment !== "FIRST_ORDER" && segment !== "BIRTHDAY_MONTH" && segment !== "RETURNING") {
    return null;
  }
  return {
    segment,
    minVisitCount:
      row.minVisitCount != null && Number(row.minVisitCount) > 0
        ? Number(row.minVisitCount)
        : 2,
    valueType: row.valueType === "FIXED" ? "FIXED" : "PERCENT",
  };
}

export function isBirthdayMonth(dateOfBirth: Date, at = new Date()): boolean {
  return dateOfBirth.getUTCMonth() === at.getUTCMonth();
}

export function customerSegmentMatches(
  promotion: Pick<PromotionDefinition, "kind" | "customerSegmentConfig">,
  activeSegments: CustomerSegmentType[],
  deliveredOrderCount: number
): boolean {
  if (promotion.kind !== "CUSTOMER_SEGMENT" || !promotion.customerSegmentConfig) {
    return true;
  }

  const required = promotion.customerSegmentConfig.segment;
  if (required === "RETURNING") {
    const minVisits = promotion.customerSegmentConfig.minVisitCount ?? 2;
    return deliveredOrderCount >= minVisits;
  }
  return activeSegments.includes(required);
}
