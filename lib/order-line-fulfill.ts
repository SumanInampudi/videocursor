import "server-only";

import { db } from "@/lib/db";
import { applyFifoConsumptions, ensureCostLayers } from "@/lib/inventory-fifo";
import {
  isCounterLine,
  planProductStockDeduction,
  type ProductForStockPlan,
} from "@/lib/product-fulfillment";

export type OrderLineForFulfillment = {
  id: string;
  quantity: number;
  unitSalePrice: { toString(): string } | number;
  productName: string;
  processedAt: Date | null;
  product: ProductForStockPlan | null;
};

export async function fulfillOrderLineIfNeeded(
  line: OrderLineForFulfillment
): Promise<{ success: true } | { error: string }> {
  if (line.processedAt) return { success: true };

  if (!line.product) {
    return { error: `Cannot fulfill: product "${line.productName}" was removed from the catalog` };
  }

  const plan = planProductStockDeduction(line.product, line.quantity);
  if (!plan.ok) {
    return { error: plan.error };
  }

  await db.$transaction(async (tx) => {
    for (const consumption of plan.consumptions) {
      await ensureCostLayers(tx, consumption.inventoryItemId);
    }
    await applyFifoConsumptions(tx, plan.consumptions);
    for (const consumption of plan.consumptions) {
      await tx.orderLineConsumption.create({
        data: {
          orderLineItemId: line.id,
          inventoryItemId: consumption.inventoryItemId,
          quantityDeducted: consumption.quantityDeducted,
          unit: consumption.unit,
          costPerUnit: consumption.costPerUnit,
          lineCost: consumption.lineCost,
        },
      });
    }

    const revenue = Number(line.unitSalePrice) * line.quantity;
    await tx.orderLineItem.update({
      where: { id: line.id },
      data: {
        ingredientCost: plan.totalCost,
        revenue,
        profit: revenue - plan.totalCost,
        processedAt: new Date(),
      },
    });
  });

  return { success: true };
}

export async function fulfillMatchingOrderLines(
  lines: OrderLineForFulfillment[],
  match: (product: ProductForStockPlan | null) => boolean
): Promise<{ success: true } | { error: string }> {
  for (const line of lines) {
    if (line.processedAt) continue;
    if (!match(line.product)) continue;

    const result = await fulfillOrderLineIfNeeded(line);
    if ("error" in result) return result;
  }

  return { success: true };
}

/** Caller should pass kitchen / prepared lines only. */
export async function fulfillKitchenOrderLines(
  lines: OrderLineForFulfillment[]
): Promise<{ success: true } | { error: string }> {
  for (const line of lines) {
    if (line.processedAt) continue;
    const result = await fulfillOrderLineIfNeeded(line);
    if ("error" in result) return result;
  }
  return { success: true };
}

export async function fulfillRetailOrderLines(
  lines: OrderLineForFulfillment[]
): Promise<{ success: true } | { error: string }> {
  return fulfillMatchingOrderLines(lines, (product) => isCounterLine(product));
}

export async function fulfillRetailOrderLineById(
  lineId: string,
  businessId: string
): Promise<{ success: true } | { error: string }> {
  const line = await db.orderLineItem.findFirst({
    where: { id: lineId, order: { businessId } },
    include: {
      product: {
        include: {
          ingredients: {
            include: {
              ingredient: {
                include: {
                  inventoryItems: {
                    where: { isActive: true },
                    include: {
                      costLayers: {
                        where: { quantityRemaining: { gt: 0 } },
                        orderBy: { createdAt: "asc" },
                      },
                    },
                  },
                },
              },
            },
          },
          retailInventoryItem: {
            include: {
              ingredient: { select: { wastagePercent: true } },
              costLayers: {
                where: { quantityRemaining: { gt: 0 } },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!line) return { error: "Line not found" };
  if (!isCounterLine(line.product)) return { error: "Not a retail / counter line" };

  return fulfillOrderLineIfNeeded({
    id: line.id,
    quantity: line.quantity,
    unitSalePrice: line.unitSalePrice,
    productName: line.productName,
    processedAt: line.processedAt,
    product: line.product as ProductForStockPlan | null,
  });
}
