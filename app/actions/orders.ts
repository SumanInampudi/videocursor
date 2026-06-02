"use server";

import { revalidatePath } from "next/cache";
import { getVenuePosSettings } from "@/app/actions/venue";
import { logAudit } from "@/lib/audit";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { getOrderedPosCategories } from "@/app/actions/pos-settings";
import { serializeForClient } from "@/lib/serialize";
import { applyFifoConsumptions, ensureCostLayers } from "@/lib/inventory-fifo";
import { planRecipeStockDeduction } from "@/lib/recipe-fulfillment";
import { recipeIngredientsWithFifoStock } from "@/lib/inventory-stock-query";
import { validateOrderLinesStock } from "@/lib/order-stock-server";
import { estimateOrderPrepMinutes } from "@/lib/order-prep-time";
import {
  assertNoOpenOrderOnTable,
  addLinesToOpenOrder,
} from "@/app/actions/table-service";
import {
  applyDiscountToLines,
  buildLinePayloadsForBusiness,
} from "@/lib/order-line-build";
import { isPayAtClose } from "@/lib/venue-settings";
import {
  createOrderSchema,
  posCheckoutSchema,
  posSendToKitchenSchema,
} from "@/lib/validations";
import type { OrdersListQuery } from "@/lib/orders-list";
import { ORDERS_PAGE_SIZE } from "@/lib/orders-list";
import { parseTipFromForm, buildOrderTaxFields } from "@/lib/apply-order-tax";
import { sortOrdersByReceived } from "@/lib/orders-sort";
import {
  ORDER_STATUS,
  statusDeductionOnTransition,
  statusFlowForChannel,
} from "@/lib/order-pipeline";
import { OrderChannel, OrderPaymentMethod, OrderStatus, Prisma } from "@prisma/client";

const ORDER_PATHS = [
  "/orders",
  "/orders/new",
  "/orders/pos",
  "/orders/pos/settings",
  "/orders/kitchen",
  "/",
  "/reports",
  "/inventory",
  "/yield",
  "/recipes",
];

const PUBLIC_QUEUE_PATHS = ["/queue"];

function revalidateOrders() {
  for (const path of [...ORDER_PATHS, ...PUBLIC_QUEUE_PATHS]) {
    revalidatePath(path);
  }
}

function generateOrderNumber(channel: OrderChannel): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const prefix = channel === "ONLINE" ? "O" : "D";
  const suffix = Date.now().toString().slice(-6);
  return `${prefix}-${y}${m}${d}-${suffix}`;
}

export async function getOrdersByStatus() {
  const { businessId } = await requireBusinessContext();
  const orders = await db.order.findMany({
    where: { businessId },
    include: {
      customer: { select: { id: true, name: true } },
      lineItems: {
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              yieldUnit: true,
              barcode: true,
              prepTimeMinutes: true,
              recipeType: true,
              requiresKitchen: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const enriched = orders.map((order) => ({
    ...order,
    lineItems: [...order.lineItems].sort((a, b) => {
      const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    }),
    estimatedPrepMinutes: estimateOrderPrepMinutes(
      order.lineItems
        .filter((line) => line.recipe?.requiresKitchen !== false)
        .map((line) => ({
          quantity: line.quantity,
          prepTimeMinutes: line.recipe?.prepTimeMinutes ?? null,
        }))
    ),
  }));

  const grouped: Record<OrderStatus, (typeof enriched)[number][]> = {
    NEW: [],
    PROCESSING: [],
    PACKING: [],
    READY: [],
    DELIVERED: [],
    CANCELLED: [],
  };

  for (const order of enriched) {
    grouped[order.status].push(order);
  }

  for (const status of Object.keys(grouped) as OrderStatus[]) {
    grouped[status] = sortOrdersByReceived(grouped[status]);
  }

  return serializeForClient(grouped);
}

export async function getOrder(id: string) {
  const { businessId } = await requireBusinessContext();
  const order = await db.order.findFirst({
    where: { id, businessId },
    include: {
      customer: { select: { id: true, name: true } },
      diningTable: { select: { id: true, code: true, label: true } },
      lineItems: {
        include: {
          recipe: true,
          consumptions: {
            include: { inventoryItem: { select: { id: true, name: true, sku: true } } },
          },
        },
      },
    },
  });

  return order ? serializeForClient(order) : null;
}

export async function getRecipesForOrdering() {
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      category: true,
      salePrice: true,
      barcode: true,
      yieldUnit: true,
      yieldQuantity: true,
      imageUrl: true,
    },
    orderBy: { name: "asc" },
  });
  return serializeForClient(recipes);
}

/** Menu data for full-screen POS (categories, items, frequently sold). */
export async function getPosMenuData() {
  const { businessId } = await requireBusinessContext();
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [recipes, frequentGroups] = await Promise.all([
    db.recipe.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        category: true,
        salePrice: true,
        prepTimeMinutes: true,
        barcode: true,
        yieldUnit: true,
        imageUrl: true,
        recipeType: true,
        requiresKitchen: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.orderLineItem.groupBy({
      by: ["recipeId"],
      where: {
        recipeId: { not: null },
        order: {
          businessId,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: since },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 20,
    }),
  ]);

  const frequentIds = frequentGroups
    .map((row) => row.recipeId)
    .filter((id): id is string => id != null);

  const allCategories = [...new Set(recipes.map((r) => r.category))];
  const categories = await getOrderedPosCategories(allCategories);

  return serializeForClient({
    recipes,
    categories,
    frequentIds,
  });
}

export async function createOrder(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const existingOrderId = String(raw.existingOrderId || "").trim();
  if (existingOrderId) {
    return addLinesToOpenOrder(formData);
  }

  const lineCount = parseInt(String(raw.lineCount || "0"), 10);
  const lines = [];

  for (let i = 0; i < lineCount; i++) {
    lines.push({
      recipeId: String(raw[`line_${i}_recipeId`] || ""),
      quantity: raw[`line_${i}_quantity`],
    });
  }

  const sendToKitchen = raw.sendToKitchen === "true";
  const isPosFlow = raw.posFlow === "true" || Boolean(raw.paymentMethod) || sendToKitchen;
  const channelRaw = (raw.channel as OrderChannel) || "DINE_IN";

  const venueEarly = isPosFlow ? await getVenuePosSettings() : null;
  const payAtClose =
    venueEarly != null && isPayAtClose(venueEarly, channelRaw);

  const schema =
    isPosFlow && sendToKitchen && payAtClose
      ? posSendToKitchenSchema
      : isPosFlow
        ? posCheckoutSchema
        : createOrderSchema;

  const parsed = schema.safeParse({
    customerId: raw.customerId || undefined,
    customerName: raw.customerName,
    discountCode: raw.discountCode,
    notes: raw.notes,
    paymentMethod: raw.paymentMethod || undefined,
    channel: channelRaw,
    diningTableId: raw.diningTableId || undefined,
    externalRef: raw.externalRef || undefined,
    covers: raw.covers || undefined,
    tipAmount: raw.tipAmount || undefined,
    lines,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessId } = await requireBusinessContext();
  const venue = await getVenuePosSettings();

  const channel = parsed.data.channel as OrderChannel;
  if (channel === "DINE_IN" && !venue.enableDineIn) {
    return { error: { channel: ["Dine-in is disabled for this venue"] } };
  }
  if (channel === "ONLINE" && !venue.enableOnline) {
    return { error: { channel: ["Online orders are disabled for this venue"] } };
  }

  let diningTableId: string | null = null;
  let tableLabel: string | null = null;
  if (channel === "DINE_IN") {
    if (venue.requireTableDineIn && !parsed.data.diningTableId) {
      const activeTableCount = await db.diningTable.count({
        where: { businessId, isActive: true },
      });
      if (activeTableCount === 0) {
        return {
          error: {
            diningTableId: [
              "No tables configured. Add tables under Register → Settings, or turn off “Require table for dine-in”.",
            ],
          },
        };
      }
      return { error: { diningTableId: ["Select a table for dine-in"] } };
    }
    if (parsed.data.diningTableId) {
      const table = await db.diningTable.findFirst({
        where: { id: parsed.data.diningTableId, businessId, isActive: true },
      });
      if (!table) {
        return { error: { diningTableId: ["Invalid table"] } };
      }
      diningTableId = table.id;
      tableLabel = table.label;
    }

    if (diningTableId && isPayAtClose(venue, "DINE_IN")) {
      const conflict = await assertNoOpenOrderOnTable(businessId, diningTableId);
      if (conflict) return conflict;
    }
  }

  const externalRef =
    channel === "ONLINE" ? parsed.data.externalRef?.trim() || null : null;

  const built = await buildLinePayloadsForBusiness(businessId, parsed.data.lines);
  if ("error" in built) return { error: built.error };

  const stockCheck = await validateOrderLinesStock(
    businessId,
    parsed.data.lines.map((l) => ({ recipeId: l.recipeId, quantity: l.quantity }))
  );
  if (!stockCheck.ok) {
    return { error: { stock: stockCheck.issues } };
  }

  let customerId: string | null = parsed.data.customerId || null;
  let customerName = parsed.data.customerName?.trim() || null;

  if (customerId) {
    const customer = await db.customer.findFirst({
      where: { id: customerId, businessId },
      select: { name: true },
    });
    if (customer) customerName = customer.name;
  }

  let linePayloads = built.payloads;
  const subtotal = built.subtotal;

  const discountApplied = await applyDiscountToLines(
    businessId,
    parsed.data.discountCode,
    subtotal,
    linePayloads
  );
  if ("error" in discountApplied) return { error: discountApplied.error };

  linePayloads = discountApplied.linePayloads;
  const { discountId, discountCode, discountTotal } = discountApplied;

  const paymentMethod = parsed.data.paymentMethod as OrderPaymentMethod | undefined;
  const covers =
    "covers" in parsed.data && typeof parsed.data.covers === "number"
      ? parsed.data.covers
      : null;

  const tipAmount =
    "tipAmount" in parsed.data && typeof parsed.data.tipAmount === "number"
      ? parsed.data.tipAmount
      : parseTipFromForm(raw);

  const taxFields = paymentMethod
    ? await buildOrderTaxFields(businessId, subtotal, discountTotal, tipAmount)
    : {};

  const order = await db.order.create({
    data: {
      businessId,
      orderNumber: generateOrderNumber(channel),
      channel,
      diningTableId,
      tableLabel,
      externalRef,
      customerId,
      customerName,
      covers,
      discountId,
      discountCode,
      subtotal,
      discountTotal,
      ...taxFields,
      paymentMethod: paymentMethod ?? null,
      paidAt: paymentMethod ? new Date() : null,
      notes: parsed.data.notes || null,
      status: OrderStatus.NEW,
      lineItems: { create: linePayloads },
    },
  });

  revalidateOrders();

  if (paymentMethod) {
    await tryAutoCompletePaidRetailOnlyOrder(order.id, businessId);
  }

  return { success: true, orderId: order.id, orderNumber: order.orderNumber };
}

/** POS register: pay upfront, or send to kitchen for dine-in pay-at-close tabs. */
export async function createPosOrder(formData: FormData) {
  formData.set("posFlow", "true");

  if (formData.get("existingOrderId")) {
    return addLinesToOpenOrder(formData);
  }

  const venue = await getVenuePosSettings();
  const channel = String(formData.get("channel") || "DINE_IN") as OrderChannel;
  const sendToKitchen = formData.get("sendToKitchen") === "true";

  if (channel === "DINE_IN" && isPayAtClose(venue, "DINE_IN") && sendToKitchen) {
    return createOrder(formData);
  }

  if (!formData.get("paymentMethod")) {
    return { error: { paymentMethod: ["Select Cash, Card, or PhonePe"] } };
  }
  return createOrder(formData);
}

/** Client preview before POS checkout (optional; server enforces on create). */
export async function previewCartStock(
  lines: { recipeId: string; quantity: number }[],
  existingOrderId?: string
) {
  const { businessId } = await requireBusinessContext();
  return validateOrderLinesStock(businessId, lines, {
    existingOrderId: existingOrderId || undefined,
  });
}

/** Preview stock impact before marking processing → packing. */
export async function getOrderFulfillmentPreview(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      lineItems: {
        include: {
          recipe: {
            include: recipeIngredientsWithFifoStock,
          },
        },
      },
    },
  });

  if (!order) return { error: "Order not found" };

  const issues: string[] = [];
  for (const line of order.lineItems) {
    if (line.processedAt) continue;
    if (!line.recipe) {
      issues.push(`"${line.recipeName}": recipe removed from catalog`);
      continue;
    }
    const plan = planRecipeStockDeduction(line.recipe, line.quantity);
    if (!plan.ok) {
      issues.push(`"${line.recipe?.name ?? line.recipeName}": ${plan.error}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

export async function updateOrderStatus(id: string, nextStatus: OrderStatus) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      lineItems: {
        include: {
          recipe: {
            include: recipeIngredientsWithFifoStock,
          },
        },
      },
    },
  });

  if (!order) {
    return { error: "Order not found" };
  }

  const flow = statusFlowForChannel(order.channel);
  const allowed = flow[order.status];
  if (!allowed.includes(nextStatus)) {
    return { error: `Cannot move from ${order.status} to ${nextStatus}` };
  }

  if (statusDeductionOnTransition(order.status, nextStatus, order.channel)) {
    const fulfillResult = await fulfillOrderInventory(order);
    if ("error" in fulfillResult) {
      return fulfillResult;
    }
  }

  const timestamps: Prisma.OrderUpdateInput = { status: nextStatus };

  if (nextStatus === ORDER_STATUS.PROCESSING) {
    timestamps.processedAt = new Date();
  }
  if (nextStatus === ORDER_STATUS.PACKING) {
    timestamps.packingAt = new Date();
  }
  if (nextStatus === ORDER_STATUS.READY) {
    timestamps.readyAt = new Date();
  }
  if (nextStatus === ORDER_STATUS.DELIVERED) {
    timestamps.deliveredAt = new Date();
  }

  await db.order.update({
    where: { id },
    data: timestamps,
  });

  await logAudit("order.status_change", "order", id, {
    from: order.status,
    to: nextStatus,
  });

  revalidateOrders();
  return { success: true };
}

/** Cancel an open order; restores inventory if stock was deducted at Ready. */
export async function cancelOrder(orderId: string, reason?: string) {
  const { businessId } = await requireBusinessContext();
  const { getAuthContext } = await import("@/lib/auth");
  const { isAdminRole } = await import("@/lib/permissions");
  const auth = await getAuthContext();
  if (!auth.user) {
    return { error: "Sign in required" };
  }

  const order = await db.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      lineItems: {
        include: {
          consumptions: true,
        },
      },
    },
  });

  if (!order) {
    return { error: "Order not found" };
  }

  if (order.status === OrderStatus.CANCELLED) {
    return { error: "Order is already cancelled" };
  }
  if (order.status === OrderStatus.DELIVERED) {
    return { error: "Delivered orders cannot be cancelled" };
  }
  if (
    ![OrderStatus.NEW, OrderStatus.PROCESSING, OrderStatus.PACKING, OrderStatus.READY].includes(
      order.status
    )
  ) {
    return { error: "This order cannot be cancelled" };
  }

  if (
    (order.status === OrderStatus.PACKING || order.status === OrderStatus.READY) &&
    !isAdminRole(auth.user.role)
  ) {
    return {
      error:
        "Only a manager can cancel an order after packing started (stock will be restored).",
    };
  }
  if (
    !isAdminRole(auth.user.role) &&
    auth.user.role !== "KITCHEN"
  ) {
    return { error: "You do not have permission to cancel orders" };
  }

  const trimmedReason = reason?.trim() || null;

  try {
    await db.$transaction(async (tx) => {
      if (
        order.status === OrderStatus.PACKING ||
        order.status === OrderStatus.READY
      ) {
        for (const line of order.lineItems) {
          for (const c of line.consumptions) {
            const item = await tx.inventoryItem.findUniqueOrThrow({
              where: { id: c.inventoryItemId },
            });
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: {
                quantity:
                  Number(item.quantity) + Number(c.quantityDeducted),
              },
            });
            await tx.inventoryCostHistory.create({
              data: {
                inventoryItemId: item.id,
                costPerUnit: Number(item.costPerUnit),
                previousCost: Number(item.costPerUnit),
                note: `Restored — order ${order.orderNumber} cancelled`,
              },
            });
          }
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: trimmedReason,
        },
      });
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not cancel order",
    };
  }

  await logAudit("order.cancelled", "order", orderId, {
    orderNumber: order.orderNumber,
    from: order.status,
    reason: trimmedReason,
    stockRestored:
      order.status === OrderStatus.PACKING || order.status === OrderStatus.READY,
  });

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { slug: true },
  });
  if (business?.slug) {
    revalidatePath(`/queue/${business.slug}`);
  }

  revalidateOrders();
  revalidatePath("/queue", "layout");
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

type OrderForFulfillment = {
  lineItems: {
    id: string;
    recipeName: string;
    quantity: number;
    unitSalePrice: Prisma.Decimal;
    processedAt: Date | null;
    recipe: Parameters<typeof planRecipeStockDeduction>[0] | null;
  }[];
};

/** Paid POS tabs with only retail lines — deduct stock and mark delivered immediately. */
async function tryAutoCompletePaidRetailOnlyOrder(orderId: string, businessId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      lineItems: {
        include: {
          recipe: {
            include: recipeIngredientsWithFifoStock,
          },
        },
      },
    },
  });
  if (!order) return;

  const recipes = order.lineItems.map((l) => l.recipe).filter(Boolean);
  if (recipes.length === 0) return;
  const allRetail = recipes.every((r) => r!.recipeType === "RETAIL");
  if (!allRetail) return;

  const fulfillResult = await fulfillOrderInventory(order);
  if ("error" in fulfillResult) return;

  await db.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  });
}

async function fulfillOrderInventory(order: OrderForFulfillment) {

  for (const line of order.lineItems) {
    if (line.processedAt) continue;

    if (!line.recipe) {
      return {
        error: `Cannot fulfill: recipe "${line.recipeName}" was removed from the catalog`,
      };
    }

    const plan = planRecipeStockDeduction(line.recipe, line.quantity);
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
  }

  return { success: true };
}

function buildOrdersListWhere(
  businessId: string,
  filters: OrdersListQuery
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { businessId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.payment === "unpaid") {
    where.paidAt = null;
  } else if (filters.payment) {
    where.paymentMethod = filters.payment;
  }

  if (filters.todayOnly) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    where.createdAt = { gte: todayStart };
  }

  const q = filters.search?.trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { customerName: { contains: q } },
      { discountCode: { contains: q } },
      { customer: { name: { contains: q } } },
      { lineItems: { some: { recipeName: { contains: q } } } },
    ];
  }

  return where;
}

export async function getOrdersList(filters: OrdersListQuery = {}) {
  const { businessId } = await requireBusinessContext();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = ORDERS_PAGE_SIZE;
  const skip = (page - 1) * pageSize;
  const where = buildOrdersListWhere(businessId, filters);

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        lineItems: {
          select: {
            id: true,
            quantity: true,
            unitSalePrice: true,
            recipeName: true,
            recipe: { select: { name: true, yieldUnit: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: pageSize,
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return serializeForClient({
    orders: sortOrdersByReceived(orders),
    total,
    page,
    pageSize,
    totalPages,
  });
}

export async function getOrderDashboardStats() {
  const { businessId } = await requireBusinessContext();
  const [newCount, processingCount, packingCount, readyCount, deliveredToday] =
    await Promise.all([
    db.order.count({ where: { businessId, status: OrderStatus.NEW } }),
    db.order.count({ where: { businessId, status: OrderStatus.PROCESSING } }),
    db.order.count({ where: { businessId, status: OrderStatus.PACKING } }),
    db.order.count({ where: { businessId, status: OrderStatus.READY } }),
    db.order.count({
      where: {
        businessId,
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return { newCount, processingCount, packingCount, readyCount, deliveredToday };
}

export async function deleteOrder(orderId: string) {
  try {
    const { businessId } = await requireBusinessContext();
    const order = await db.order.findFirst({
      where: { id: orderId, businessId },
      select: {
        orderNumber: true,
        status: true,
        lineItems: {
          select: { consumptions: { select: { id: true }, take: 1 } },
        },
      },
    });
    if (!order) {
      return { success: false, message: "Order not found." };
    }
    const hasConsumptions = order.lineItems.some((l) => l.consumptions.length > 0);
    if (
      hasConsumptions ||
      order.status === OrderStatus.PACKING ||
      order.status === OrderStatus.READY
    ) {
      return {
        success: false,
        message: "Cancel this order instead — stock was already deducted.",
      };
    }
    await db.order.delete({
      where: { id: orderId },
    });
    await logAudit("order.delete", "order", orderId, {
      orderNumber: order?.orderNumber,
    });
    revalidateOrders();
    return { success: true, message: "Order deleted successfully." };
  } catch (error) {
    console.error("Error deleting order:", error);
    return { success: false, message: "Failed to delete order." };
  }
}
