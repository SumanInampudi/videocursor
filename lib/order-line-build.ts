import "server-only";

import { db } from "@/lib/db";
import {
  expandPaidLinesWithInclusions,
  formatIncludedProductName,
  type ProductInclusionRef,
} from "@/lib/product-inclusions";
import { mapDiscountToPromotion } from "@/lib/promotion-db";
import { applyPromotions, emptyPromotionResult } from "@/lib/promotion-engine/apply";
import {
  applyManagerAdjustments,
  hasManagerAdjustments,
} from "@/lib/promotion-engine/manager";
import type {
  AppliedPromotion,
  ManagerAdjustmentsInput,
  PromotionLine,
} from "@/lib/promotion-engine/types";
import { resolveCustomerPromotionContext } from "@/lib/promotion-customer";
import type { OrderChannel, OrderPaymentMethod } from "@prisma/client";

export type LineInput = { productId: string; quantity: number };

export type BuiltLinePayload = PromotionLine;

async function loadInclusionsByParent(
  businessId: string,
  parentProductIds: string[]
): Promise<Record<string, ProductInclusionRef[]>> {
  if (parentProductIds.length === 0) return {};

  const rows = await db.productInclusion.findMany({
    where: {
      parentProductId: { in: parentProductIds },
      parentProduct: { businessId },
      includedProduct: {
        businessId,
        productType: { in: ["PREPARED", "PREP"] },
      },
    },
    include: {
      includedProduct: { select: { id: true, name: true } },
    },
  });

  const map: Record<string, ProductInclusionRef[]> = {};
  for (const row of rows) {
    const ref: ProductInclusionRef = {
      includedProductId: row.includedProduct.id,
      includedProductName: row.includedProduct.name,
      quantityPerParent: row.quantityPerParent,
    };
    (map[row.parentProductId] ??= []).push(ref);
  }
  return map;
}

export async function buildLinePayloadsForBusiness(
  businessId: string,
  lines: LineInput[]
): Promise<
  | { error: { lines: string[] } }
  | { payloads: BuiltLinePayload[]; subtotal: number }
> {
  const paidLines = lines.filter((line) => line.quantity > 0);
  const productIds = [...new Set(paidLines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, businessId },
    select: { id: true, salePrice: true, name: true, category: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const line of paidLines) {
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

  const paidPayloads: BuiltLinePayload[] = paidLines.map((line) => {
    const product = productMap.get(line.productId)!;
    const unitSalePrice = Number(product.salePrice);
    return {
      productId: line.productId,
      productName: product.name,
      category: product.category,
      quantity: line.quantity,
      unitSalePrice,
      revenue: unitSalePrice * line.quantity,
      isIncluded: false,
    };
  });

  const subtotal = paidPayloads.reduce((s, l) => s + l.revenue, 0);

  const inclusionsByParent = await loadInclusionsByParent(businessId, productIds);
  const expandedInputs = expandPaidLinesWithInclusions(paidLines, inclusionsByParent);

  const includedProductIds = [
    ...new Set(
      expandedInputs.filter((line) => line.isIncluded).map((line) => line.productId)
    ),
  ];
  const includedProducts =
    includedProductIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: includedProductIds }, businessId },
          select: { id: true, name: true, category: true },
        })
      : [];
  const includedMap = new Map(includedProducts.map((p) => [p.id, p]));

  for (const line of expandedInputs) {
    if (!line.isIncluded) continue;
    if (!includedMap.get(line.productId)) {
      return { error: { lines: ["An included side product was not found"] } };
    }
  }

  const payloads: BuiltLinePayload[] = [...paidPayloads];
  for (const line of expandedInputs) {
    if (!line.isIncluded) continue;
    const product = includedMap.get(line.productId)!;
    payloads.push({
      productId: line.productId,
      productName: line.productName ?? formatIncludedProductName(product.name),
      category: product.category,
      quantity: line.quantity,
      unitSalePrice: 0,
      revenue: 0,
      isIncluded: true,
    });
  }

  return { payloads, subtotal };
}

async function loadActivePromotions(businessId: string) {
  const rows = await db.discount.findMany({
    where: { businessId, isActive: true },
    include: { targets: true },
    orderBy: [{ priority: "asc" }, { code: "asc" }],
  });
  return rows.map(mapDiscountToPromotion);
}

export async function applyDiscountToLines(
  businessId: string,
  code: string | undefined,
  subtotal: number,
  linePayloads: BuiltLinePayload[],
  options?: {
    channel?: OrderChannel;
    includeAuto?: boolean;
    customerId?: string | null;
    paymentMethod?: OrderPaymentMethod | null;
  }
): Promise<
  | { error: { discountCode: string[] } }
  | {
      discountId: string | null;
      discountCode: string | null;
      discountTotal: number;
      linePayloads: BuiltLinePayload[];
      appliedPromotions: AppliedPromotion[];
    }
> {
  const channel = options?.channel ?? "DINE_IN";
  const includeAuto = options?.includeAuto ?? true;
  const trimmed = code?.trim().toUpperCase();

  if (!trimmed && !includeAuto) {
    const empty = emptyPromotionResult(linePayloads);
    return {
      discountId: empty.discountId,
      discountCode: empty.discountCode,
      discountTotal: empty.discountTotal,
      linePayloads: empty.linePayloads,
      appliedPromotions: empty.appliedPromotions,
    };
  }

  const customerContext = await resolveCustomerPromotionContext(
    businessId,
    options?.customerId
  );

  const promotions = await loadActivePromotions(businessId);
  const result = applyPromotions(
    promotions,
    linePayloads.map((line) => ({ ...line })),
    subtotal,
    {
      channel,
      includeAuto,
      codes: trimmed ? [trimmed] : [],
      customerId: customerContext.customerId,
      customerSegments: customerContext.activeSegments,
      deliveredOrderCount: customerContext.deliveredOrderCount,
      paymentMethod: options?.paymentMethod ?? null,
    }
  );

  if ("error" in result) {
    return { error: { discountCode: [result.error] } };
  }

  if (trimmed && result.appliedPromotions.every((row) => row.code?.toUpperCase() !== trimmed)) {
    return { error: { discountCode: ["Invalid discount code"] } };
  }

  return {
    discountId: result.discountId,
    discountCode: result.discountCode,
    discountTotal: result.discountTotal,
    linePayloads: result.linePayloads,
    appliedPromotions: result.appliedPromotions,
  };
}

export async function applyOrderPromotions(
  businessId: string,
  code: string | undefined,
  subtotal: number,
  linePayloads: BuiltLinePayload[],
  options?: {
    channel?: OrderChannel;
    includeAuto?: boolean;
    customerId?: string | null;
    paymentMethod?: OrderPaymentMethod | null;
    managerAdjustments?: ManagerAdjustmentsInput;
    appliedByUserId?: string | null;
  }
): Promise<
  | { error: Record<string, string[]> }
  | {
      discountId: string | null;
      discountCode: string | null;
      discountTotal: number;
      linePayloads: BuiltLinePayload[];
      appliedPromotions: AppliedPromotion[];
    }
> {
  const discountApplied = await applyDiscountToLines(
    businessId,
    code,
    subtotal,
    linePayloads,
    {
      channel: options?.channel,
      includeAuto: options?.includeAuto,
      customerId: options?.customerId,
      paymentMethod: options?.paymentMethod,
    }
  );

  if ("error" in discountApplied) {
    return { error: discountApplied.error };
  }

  const managerAdjustments = options?.managerAdjustments;
  if (!managerAdjustments || !hasManagerAdjustments(managerAdjustments)) {
    return discountApplied;
  }

  const managerResult = applyManagerAdjustments(
    discountApplied.linePayloads,
    managerAdjustments,
    options?.appliedByUserId ?? null
  );

  if ("error" in managerResult) {
    return { error: { managerDiscount: [managerResult.error] } };
  }

  const managerTotal = managerResult.applied.reduce((sum, row) => sum + row.discountAmount, 0);
  const discountTotal =
    Math.round((discountApplied.discountTotal + managerTotal) * 100) / 100;

  return {
    discountId: discountApplied.discountId,
    discountCode: discountApplied.discountCode,
    discountTotal,
    linePayloads: managerResult.nextLines,
    appliedPromotions: [...discountApplied.appliedPromotions, ...managerResult.applied],
  };
}

export function recalculateOrderSubtotalFromLines(
  lineItems: { quantity: number; unitSalePrice: number | { toString(): string } }[]
): number {
  return lineItems.reduce((s, l) => s + Number(l.unitSalePrice) * l.quantity, 0);
}
