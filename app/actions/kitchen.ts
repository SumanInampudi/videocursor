"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { kitchenLineProgress } from "@/lib/kitchen-kds";

const KITCHEN_PATHS = ["/orders/kitchen", "/orders"];

function revalidateKitchen() {
  for (const p of KITCHEN_PATHS) revalidatePath(p);
}

export async function acknowledgeKitchenOrder(orderId: string) {
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

  revalidateKitchen();
  return { success: true };
}

export async function toggleKitchenLineDone(lineId: string) {
  const { businessId } = await requireBusinessContext();
  const line = await db.orderLineItem.findFirst({
    where: { id: lineId, order: { businessId } },
    select: { id: true, quantity: true, kitchenDoneQty: true, orderId: true },
  });
  if (!line) return { error: "Line not found" };

  const fullyDone = line.kitchenDoneQty >= line.quantity;
  await db.orderLineItem.update({
    where: { id: lineId },
    data: fullyDone
      ? { kitchenDoneQty: 0, kitchenDoneAt: null }
      : { kitchenDoneQty: line.quantity, kitchenDoneAt: new Date() },
  });

  revalidateKitchen();
  return { success: true, done: !fullyDone };
}

export async function getKitchenPackWarning(orderId: string): Promise<{
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
          recipeName: true,
          addedAt: true,
          kitchenDoneAt: true,
          kitchenDoneQty: true,
        },
      },
    },
  });
  if (!order) return { incomplete: false, done: 0, total: 0 };

  const { done, total } = kitchenLineProgress(order.lineItems);
  return { incomplete: total > 0 && done < total, done, total };
}
