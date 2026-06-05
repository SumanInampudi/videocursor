import "server-only";

import { calculateDiscountAmount, isDiscountValid } from "@/lib/discount-calc";
import { db } from "@/lib/db";

export type LineInput = { productId: string; quantity: number };

export type BuiltLinePayload = {
  productId: string;
  productName: string;
  quantity: number;
  unitSalePrice: number;
  revenue: number;
};

export async function buildLinePayloadsForBusiness(
  businessId: string,
  lines: LineInput[]
): Promise<
  | { error: { lines: string[] } }
  | { payloads: BuiltLinePayload[]; subtotal: number }
> {
  const productIds = lines.map((l) => l.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, businessId },
    select: { id: true, salePrice: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const line of lines) {
    const product = productMap.get(line.productId);
    if (!product) {
      return { error: { lines: ["One or more products were not found"] } };
    }
    if (product.salePrice == null) {
      return {
        error: { lines: [`Set a sale price for "${product.name}" before ordering`] },
      };
    }
  }

  const payloads: BuiltLinePayload[] = lines.map((line) => {
    const product = productMap.get(line.productId)!;
    const unitSalePrice = Number(product.salePrice);
    return {
      productId: line.productId,
      productName: product.name,
      quantity: line.quantity,
      unitSalePrice,
      revenue: unitSalePrice * line.quantity,
    };
  });

  const subtotal = payloads.reduce((s, l) => s + l.revenue, 0);
  return { payloads, subtotal };
}

export async function applyDiscountToLines(
  businessId: string,
  code: string | undefined,
  subtotal: number,
  linePayloads: BuiltLinePayload[]
): Promise<
  | { error: { discountCode: string[] } }
  | {
      discountId: string | null;
      discountCode: string | null;
      discountTotal: number;
      linePayloads: BuiltLinePayload[];
    }
> {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) {
    return {
      discountId: null,
      discountCode: null,
      discountTotal: 0,
      linePayloads,
    };
  }

  const discount = await db.discount.findFirst({ where: { code: trimmed, businessId } });
  if (!discount) {
    return { error: { discountCode: ["Invalid discount code"] } };
  }

  const d = {
    type: discount.type,
    value: Number(discount.value),
    minOrderAmount:
      discount.minOrderAmount != null ? Number(discount.minOrderAmount) : null,
    isActive: discount.isActive,
    validFrom: discount.validFrom,
    validTo: discount.validTo,
  };

  if (!isDiscountValid(d, subtotal)) {
    return { error: { discountCode: ["Discount not valid for this order"] } };
  }

  const discountTotal = calculateDiscountAmount(d, subtotal);
  const next = [...linePayloads];
  if (discountTotal > 0 && subtotal > 0) {
    const factor = (subtotal - discountTotal) / subtotal;
    for (const line of next) {
      line.revenue = Math.round(line.revenue * factor * 100) / 100;
    }
  }

  return {
    discountId: discount.id,
    discountCode: discount.code,
    discountTotal,
    linePayloads: next,
  };
}

export function recalculateOrderSubtotalFromLines(
  lineItems: { quantity: number; unitSalePrice: number | { toString(): string } }[]
): number {
  return lineItems.reduce((s, l) => s + Number(l.unitSalePrice) * l.quantity, 0);
}
