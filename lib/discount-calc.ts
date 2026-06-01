import { DiscountType } from "@prisma/client";

export type DiscountLike = {
  type: DiscountType;
  value: number;
  minOrderAmount: number | null;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
};

export function isDiscountValid(discount: DiscountLike, subtotal: number, at = new Date()): boolean {
  if (!discount.isActive) return false;
  if (discount.minOrderAmount != null && subtotal < discount.minOrderAmount) return false;

  const day = at.toISOString().slice(0, 10);
  if (discount.validFrom) {
    const from = discount.validFrom.toISOString().slice(0, 10);
    if (day < from) return false;
  }
  if (discount.validTo) {
    const to = discount.validTo.toISOString().slice(0, 10);
    if (day > to) return false;
  }

  return true;
}

export function calculateDiscountAmount(discount: DiscountLike, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (discount.type === "PERCENT") {
    return Math.min(subtotal, (subtotal * discount.value) / 100);
  }
  return Math.min(subtotal, discount.value);
}
