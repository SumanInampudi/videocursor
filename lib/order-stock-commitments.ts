import {
  mergeOrderLinesByProduct,
  type OrderLineStockInput,
} from "@/lib/order-stock-check";
import type { YieldResult } from "@/lib/yield";

/** Servings still reserved on active orders before physical stock deduction. */
export function availableAfterCommitments(maxYield: number, committedQty: number): number {
  return Math.max(0, maxYield - committedQty);
}

export function enrichYieldsWithCommitments(
  yields: YieldResult[],
  committed: Map<string, number>
): YieldResult[] {
  return yields.map((y) => {
    const committedQty = committed.get(y.productId) ?? 0;
    const availableYield = availableAfterCommitments(y.maxYield, committedQty);
    return {
      ...y,
      committedQty,
      availableYield,
      canSell: y.canMake && availableYield > 0,
    };
  });
}

/** Merge pipeline commitments into cart/order lines for a single stock check. */
export function demandLinesWithCommitments(
  lines: OrderLineStockInput[],
  committed: Map<string, number>
): OrderLineStockInput[] {
  const merged = mergeOrderLinesByProduct(lines);

  for (const [productId, qty] of committed) {
    if (qty <= 0) continue;
    const existing = merged.get(productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      merged.set(productId, { productId, quantity: qty });
    }
  }

  return [...merged.values()];
}
