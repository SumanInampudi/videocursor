import "server-only";

import { db } from "@/lib/db";
import { checkStockForProducts, type OrderLineStockInput } from "@/lib/order-stock-check";
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

/** Validate lines against current inventory (merges open-tab lines when adding). */
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

  const productIds = [...new Set(linesToCheck.map((l) => l.productId))];
  const products = await loadProductsForStockCheck(businessId, productIds);
  return checkStockForProducts(products, linesToCheck);
}
