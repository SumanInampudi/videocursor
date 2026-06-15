"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { fulfillRetailOrderLineById } from "@/lib/order-line-fulfill";
import {
  counterLineProgressForRetail,
  isCounterLine,
  kitchenLineProgressForKitchen,
} from "@/lib/product-fulfillment";

const COUNTER_PATHS = ["/orders/counter", "/orders/kitchen", "/orders"];

function revalidateCounter() {
  for (const p of COUNTER_PATHS) revalidatePath(p);
}

export async function acknowledgeCounterOrder(orderId: string) {
  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id: orderId, businessId },
    select: { id: true },
  });
  if (!order) return { error: "Order not found" };

  await db.order.update({
    where: { id: orderId },
    data: { kitchenAcknowledgedAt: new Date() },
  });

  revalidateCounter();
  return { success: true };
}

export async function toggleCounterLineDone(lineId: string) {
  const { businessId } = await requireBusinessContext();
  const line = await db.orderLineItem.findFirst({
    where: { id: lineId, order: { businessId } },
    include: {
      product: { select: { productType: true, requiresKitchen: true } },
    },
  });
  if (!line) return { error: "Line not found" };
  if (!isCounterLine(line.product)) {
    return { error: "This line is not a retail / counter item" };
  }

  const fullyDone = line.kitchenDoneQty >= line.quantity;
  const markingDone = !fullyDone;

  await db.orderLineItem.update({
    where: { id: lineId },
    data: markingDone
      ? { kitchenDoneQty: line.quantity, kitchenDoneAt: new Date() }
      : { kitchenDoneQty: 0, kitchenDoneAt: null },
  });

  if (markingDone && !line.processedAt) {
    const fulfill = await fulfillRetailOrderLineById(lineId, businessId);
    if ("error" in fulfill) {
      await db.orderLineItem.update({
        where: { id: lineId },
        data: { kitchenDoneQty: 0, kitchenDoneAt: null },
      });
      return { error: fulfill.error };
    }
  }

  revalidateCounter();
  return { success: true, done: markingDone };
}

export async function getCounterPackWarning(orderId: string): Promise<{
  incomplete: boolean;
  done: number;
  total: number;
}> {
  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      lineItems: {
        select: {
          id: true,
          quantity: true,
          productName: true,
          addedAt: true,
          kitchenDoneAt: true,
          kitchenDoneQty: true,
          product: { select: { productType: true, requiresKitchen: true } },
        },
      },
    },
  });
  if (!order) return { incomplete: false, done: 0, total: 0 };

  const { done, total } = counterLineProgressForRetail(order.lineItems);
  return { incomplete: total > 0 && done < total, done, total };
}

/** Used when counter advances a retail-only order — kitchen must be done too if present. */
export async function getKitchenIncompleteForOrder(orderId: string): Promise<{
  incomplete: boolean;
  done: number;
  total: number;
}> {
  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      lineItems: {
        select: {
          quantity: true,
          kitchenDoneQty: true,
          product: { select: { productType: true, requiresKitchen: true } },
        },
      },
    },
  });
  if (!order) return { incomplete: false, done: 0, total: 0 };

  const { done, total } = kitchenLineProgressForKitchen(order.lineItems);
  return { incomplete: total > 0 && done < total, done, total };
}
