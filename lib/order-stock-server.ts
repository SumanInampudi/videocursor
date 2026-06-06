import "server-only";

import { db } from "@/lib/db";
import { ACTIVE_ORDER_STATUSES } from "@/lib/order-pipeline";
import { checkStockForProducts, type OrderLineStockInput } from "@/lib/order-stock-check";
import { demandLinesWithCommitments } from "@/lib/order-stock-commitments";
import {
  ingredientWithFifoStockInclude,
  productIngredientsWithFifoStock,
} from "@/lib/inventory-stock-query";

async function loadProductsForStockCheck(businessId: string, productIds: string[]) {
  if (productIds.length === 0) return [];
  return db.product.findMany({
    where: { id: { in: productIds }, businessId },
    select: {
      id: true,
      name: true,
      productType: true,
      requiresKitchen: true,
      retailQuantityPerSale: true,
      retailInventoryItem: productIngredientsWithFifoStock.retailInventoryItem,
      ingredients: {
        include: {
          ingredient: ingredientWithFifoStockInclude,
        },
      },
    },
  });
}

/**
 * Quantities on active pipeline orders not yet deducted (processedAt is null).
 * Optionally exclude one order when recalculating that tab's cart.
 */
export async function getCommittedProductQuantities(
  businessId: string,
  excludeOrderId?: string
): Promise<Map<string, number>> {
  const lines = await db.orderLineItem.findMany({
    where: {
      processedAt: null,
      productId: { not: null },
      order: {
        businessId,
        status: { in: ACTIVE_ORDER_STATUSES },
        ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      },
    },
    select: { productId: true, quantity: true },
  });

  const map = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId) continue;
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
  }
  return map;
}

/** Validate lines against inventory minus servings already committed on other open orders. */
export async function validateOrderLinesStock(
  businessId: string,
  lines: OrderLineStockInput[],
  options?: { existingOrderId?: string }
): Promise<{ ok: true } | { ok: false; issues: string[] }> {
  let linesToCheck = lines;

  if (options?.existingOrderId) {
    const order = await db.order.findFirst({
      where: { id: options.existingOrderId, businessId },
      include: {
        lineItems: {
          select: {
            productId: true,
            quantity: true,
            processedAt: true,
            productName: true,
          },
        },
      },
    });
    if (order) {
      const combined: OrderLineStockInput[] = order.lineItems
        .filter((l) => l.productId && l.processedAt == null)
        .map((l) => ({
          productId: l.productId!,
          quantity: l.quantity,
          productName: l.productName,
        }));

      for (const line of lines) {
        const existing = combined.find((c) => c.productId === line.productId);
        if (existing) {
          existing.quantity += line.quantity;
        } else {
          combined.push(line);
        }
      }
      linesToCheck = combined;
    }
  }

  const committed = await getCommittedProductQuantities(
    businessId,
    options?.existingOrderId
  );
  const demandLines = demandLinesWithCommitments(linesToCheck, committed);

  const productIds = [...new Set(demandLines.map((l) => l.productId))];
  const products = await loadProductsForStockCheck(businessId, productIds);
  return checkStockForProducts(products, demandLines);
}
