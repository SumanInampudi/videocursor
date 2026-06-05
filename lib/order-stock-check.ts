import { planProductStockDeduction, type ProductForStockPlan } from "@/lib/product-fulfillment";

export type OrderLineStockInput = {
  productId: string;
  quantity: number;
  productName?: string;
};

/**
 * Merge lines by productId (sum quantities) for stock planning.
 */
export function mergeOrderLinesByProduct(
  lines: OrderLineStockInput[]
): Map<string, { productId: string; quantity: number; productName?: string }> {
  const map = new Map<string, { productId: string; quantity: number; productName?: string }>();
  for (const line of lines) {
    const existing = map.get(line.productId);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      map.set(line.productId, { ...line });
    }
  }
  return map;
}

/** Check whether active inventory can cover all lines (no deduction). */
export function checkStockForProducts(
  products: ProductForStockPlan[],
  lines: OrderLineStockInput[]
): { ok: true } | { ok: false; issues: string[] } {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const merged = mergeOrderLinesByProduct(lines);
  const issues: string[] = [];

  for (const line of merged.values()) {
    const product = productMap.get(line.productId);
    if (!product) {
      issues.push(`"${line.productName ?? line.productId}": menu item not found`);
      continue;
    }
    const plan = planProductStockDeduction(product, line.quantity);
    if (!plan.ok) {
      issues.push(`"${product.name}" (${line.quantity}×): ${plan.error}`);
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
