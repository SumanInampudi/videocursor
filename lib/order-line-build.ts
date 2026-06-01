import "server-only";

import { calculateDiscountAmount, isDiscountValid } from "@/lib/discount-calc";
import { db } from "@/lib/db";

export type LineInput = { recipeId: string; quantity: number };

export type BuiltLinePayload = {
  recipeId: string;
  recipeName: string;
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
  const recipeIds = lines.map((l) => l.recipeId);
  const recipes = await db.recipe.findMany({
    where: { id: { in: recipeIds }, businessId },
    select: { id: true, salePrice: true, name: true },
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  for (const line of lines) {
    const recipe = recipeMap.get(line.recipeId);
    if (!recipe) {
      return { error: { lines: ["One or more recipes were not found"] } };
    }
    if (recipe.salePrice == null) {
      return {
        error: { lines: [`Set a sale price for "${recipe.name}" before ordering`] },
      };
    }
  }

  const payloads: BuiltLinePayload[] = lines.map((line) => {
    const recipe = recipeMap.get(line.recipeId)!;
    const unitSalePrice = Number(recipe.salePrice);
    return {
      recipeId: line.recipeId,
      recipeName: recipe.name,
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
