"use server";

import { revalidatePath } from "next/cache";
import { getVenuePosSettings } from "@/app/actions/venue";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import {
  applyDiscountToLines,
  buildLinePayloadsForBusiness,
  recalculateOrderSubtotalFromLines,
} from "@/lib/order-line-build";
import { serializeForClient } from "@/lib/serialize";
import { sortOrdersByReceived } from "@/lib/orders-sort";
import { isOpenTableOrder, openOrderTotal } from "@/lib/table-tabs";
import {
  addOrderLinesSchema,
  settleOrderSchema,
} from "@/lib/validations";
import { OrderStatus } from "@prisma/client";

const REVALIDATE = [
  "/orders",
  "/orders/pos",
  "/orders/kitchen",
  "/orders/pos/settings",
  "/queue",
];

function revalidateTableService() {
  for (const p of REVALIDATE) revalidatePath(p);
}

export async function findOpenOrderForTable(businessId: string, diningTableId: string) {
  return db.order.findFirst({
    where: {
      businessId,
      diningTableId,
      channel: "DINE_IN",
      paidAt: null,
      status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
    },
    include: {
      lineItems: {
        select: {
          id: true,
          recipeId: true,
          quantity: true,
          unitSalePrice: true,
          recipeName: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPosTableFloor() {
  const { businessId } = await requireBusinessContext();
  const venue = await getVenuePosSettings();

  const [tables, openOrders] = await Promise.all([
    db.diningTable.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
    }),
    db.order.findMany({
      where: {
        businessId,
        channel: "DINE_IN",
        paidAt: null,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
      include: {
        lineItems: { select: { quantity: true, unitSalePrice: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const orderByTable = new Map(
    openOrders.filter((o) => o.diningTableId).map((o) => [o.diningTableId!, o])
  );

  const floor = tables.map((table) => {
    const order = orderByTable.get(table.id);
    return {
      table: serializeForClient(table),
      state: order ? ("open" as const) : ("free" as const),
      order: order
        ? serializeForClient({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
            covers: order.covers,
            createdAt: order.createdAt,
            total: openOrderTotal(order),
            lineCount: order.lineItems.length,
          })
        : null,
    };
  });

  const unassigned = sortOrdersByReceived(
    openOrders
      .filter((o) => !o.diningTableId)
      .map((o) =>
        serializeForClient({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          customerName: o.customerName,
          tableLabel: o.tableLabel,
          total: openOrderTotal(o),
          lineCount: o.lineItems.length,
          createdAt: o.createdAt,
        })
      )
  );

  return serializeForClient({ venue, floor, unassigned });
}

export async function getOrderForPosResume(orderId: string) {
  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      lineItems: {
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              salePrice: true,
              imageUrl: true,
              category: true,
              prepTimeMinutes: true,
            },
          },
        },
      },
    },
  });

  if (!order || !isOpenTableOrder(order)) {
    return { error: "Open table order not found" as const };
  }

  return serializeForClient({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      channel: order.channel,
      diningTableId: order.diningTableId,
      tableLabel: order.tableLabel,
      customerId: order.customerId,
      customerName: order.customerName,
      covers: order.covers,
      discountCode: order.discountCode,
      notes: order.notes,
      status: order.status,
    },
    cart: order.lineItems.map((line) => ({
      recipeId: line.recipeId ?? "",
      name: line.recipe?.name ?? line.recipeName,
      quantity: line.quantity,
      unitPrice: Number(line.unitSalePrice),
      imageUrl: line.recipe?.imageUrl ?? null,
    })),
  });
}

function parseLinesFromFormData(formData: FormData) {
  const lineCount = parseInt(String(formData.get("lineCount") || "0"), 10);
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    lines.push({
      recipeId: String(formData.get(`line_${i}_recipeId`) || ""),
      quantity: formData.get(`line_${i}_quantity`),
    });
  }
  return lines;
}

export async function addLinesToOpenOrder(formData: FormData) {
  const lines = parseLinesFromFormData(formData);
  const parsed = addOrderLinesSchema.safeParse({
    orderId: formData.get("existingOrderId") || formData.get("orderId"),
    lines,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id: parsed.data.orderId, businessId },
    include: { lineItems: true },
  });

  if (!order || !isOpenTableOrder(order)) {
    return { error: { orderId: ["This order is closed or already paid"] } };
  }

  const built = await buildLinePayloadsForBusiness(businessId, parsed.data.lines);
  if ("error" in built) return { error: built.error };

  const bumpedAt = new Date();

  await db.$transaction(async (tx) => {
    for (const payload of built.payloads) {
      const existing = order.lineItems.find((l) => l.recipeId === payload.recipeId);
      if (existing) {
        const newQty = existing.quantity + payload.quantity;
        const revenue = Number(existing.unitSalePrice) * newQty;
        await tx.orderLineItem.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            revenue,
            addedAt: bumpedAt,
            kitchenDoneAt: null,
          },
        });
      } else {
        await tx.orderLineItem.create({
          data: {
            orderId: order.id,
            recipeId: payload.recipeId,
            recipeName: payload.recipeName,
            quantity: payload.quantity,
            unitSalePrice: payload.unitSalePrice,
            revenue: payload.revenue,
            addedAt: bumpedAt,
          },
        });
      }
    }

    const allLines = await tx.orderLineItem.findMany({ where: { orderId: order.id } });
    const subtotal = recalculateOrderSubtotalFromLines(allLines);
    const discountTotal = Number(order.discountTotal ?? 0);
    const factor =
      discountTotal > 0 && subtotal > 0 ? (subtotal - discountTotal) / subtotal : 1;

    if (discountTotal > 0 && subtotal > 0) {
      for (const line of allLines) {
        const revenue =
          Math.round(Number(line.unitSalePrice) * line.quantity * factor * 100) / 100;
        await tx.orderLineItem.update({
          where: { id: line.id },
          data: { revenue },
        });
      }
    }

    const statusUpdate =
      order.status === OrderStatus.READY ||
      order.status === OrderStatus.PACKING ||
      order.status === OrderStatus.DELIVERED
        ? {
            status: OrderStatus.PROCESSING,
            packingAt: null,
            readyAt: null,
          }
        : {};

    await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        kitchenAcknowledgedAt: null,
        kitchenBumpedAt: bumpedAt,
        ...statusUpdate,
      },
    });
  });

  revalidateTableService();
  return { success: true, orderId: order.id, orderNumber: order.orderNumber };
}

export async function settleOrderPayment(formData: FormData) {
  const parsed = settleOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    paymentMethod: formData.get("paymentMethod"),
    discountCode: formData.get("discountCode") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id: parsed.data.orderId, businessId },
    include: { lineItems: true },
  });

  if (!order) {
    return { error: { orderId: ["Order not found"] } };
  }
  if (order.paidAt) {
    return { error: { orderId: ["Order is already paid"] } };
  }
  if (order.status === OrderStatus.CANCELLED) {
    return { error: { orderId: ["Cannot settle a cancelled order"] } };
  }

  const lineInputs = order.lineItems
    .filter((l) => l.recipeId)
    .map((l) => ({ recipeId: l.recipeId!, quantity: l.quantity }));

  if (lineInputs.length === 0) {
    return { error: { lines: ["Add items before settling"] } };
  }

  const built = await buildLinePayloadsForBusiness(businessId, lineInputs);
  if ("error" in built) return { error: built.error };

  const discountResult = await applyDiscountToLines(
    businessId,
    parsed.data.discountCode ?? order.discountCode ?? undefined,
    built.subtotal,
    built.payloads
  );

  if ("error" in discountResult) {
    return { error: discountResult.error };
  }

  for (const line of order.lineItems) {
    const match = discountResult.linePayloads.find((p) => p.recipeId === line.recipeId);
    if (match) {
      await db.orderLineItem.update({
        where: { id: line.id },
        data: { revenue: match.revenue },
      });
    }
  }

  const subtotal = built.subtotal;

  const now = new Date();
  await db.order.update({
    where: { id: order.id },
    data: {
      subtotal,
      discountId: discountResult.discountId,
      discountCode: discountResult.discountCode,
      discountTotal: discountResult.discountTotal,
      paymentMethod: parsed.data.paymentMethod,
      paidAt: now,
      status: OrderStatus.DELIVERED,
      deliveredAt: now,
    },
  });

  revalidateTableService();
  return { success: true, orderId: order.id, orderNumber: order.orderNumber };
}

export async function assertNoOpenOrderOnTable(
  businessId: string,
  diningTableId: string,
  exceptOrderId?: string
) {
  const existing = await findOpenOrderForTable(businessId, diningTableId);
  if (existing && existing.id !== exceptOrderId) {
    return {
      error: {
        diningTableId: [
          `Table already has open bill ${existing.orderNumber}. Add items to that order or settle it first.`,
        ],
      },
    };
  }
  return null;
}
