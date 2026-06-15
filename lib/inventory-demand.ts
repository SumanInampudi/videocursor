import { planProductStockDeduction, type ProductForStockPlan } from "@/lib/product-fulfillment";
import { mergeOrderLinesByProduct, type OrderLineStockInput } from "@/lib/order-stock-check";

export type InventoryOnHand = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

/** Sum planned FIFO consumption per inventory SKU across all order lines. */
export function aggregateInventoryDemand(
  products: ProductForStockPlan[],
  lines: OrderLineStockInput[]
): Map<string, number> {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const demand = new Map<string, number>();

  for (const line of mergeOrderLinesByProduct(lines).values()) {
    const product = productMap.get(line.productId);
    if (!product) continue;
    const plan = planProductStockDeduction(product, line.quantity);
    if (!plan.ok) continue;
    for (const slice of plan.consumptions) {
      demand.set(
        slice.inventoryItemId,
        (demand.get(slice.inventoryItemId) ?? 0) + slice.quantityDeducted
      );
    }
  }

  return demand;
}

export function checkSharedInventoryStock(
  products: ProductForStockPlan[],
  lines: OrderLineStockInput[],
  onHand: InventoryOnHand[]
): { ok: true } | { ok: false; issues: string[] } {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const onHandMap = new Map(onHand.map((i) => [i.id, i]));
  const issues: string[] = [];

  for (const line of mergeOrderLinesByProduct(lines).values()) {
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

  const demand = aggregateInventoryDemand(products, lines);
  for (const [itemId, needed] of demand) {
    const item = onHandMap.get(itemId);
    if (!item) {
      issues.push(`Inventory item ${itemId} not found for stock check`);
      continue;
    }
    if (needed > item.quantity + 0.0001) {
      issues.push(
        `Insufficient shared stock for ${item.name}: need ${needed.toFixed(2)} ${item.unit}, have ${item.quantity.toFixed(2)} ${item.unit}`
      );
    }
  }

  const unique = [...new Set(issues)];
  return unique.length === 0 ? { ok: true } : { ok: false, issues: unique };
}

/** How much of an inventory SKU is still free after pipeline order demand. */
export function availableInventoryAfterDemand(
  onHandQty: number,
  demandedQty: number
): number {
  return Math.max(0, onHandQty - demandedQty);
}
