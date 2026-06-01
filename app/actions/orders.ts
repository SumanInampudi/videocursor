"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrderedPosCategories } from "@/app/actions/pos-settings";
import { serializeForClient } from "@/lib/serialize";
import { planInventoryDeductions } from "@/lib/orderFulfillment";
import { calculateDiscountAmount, isDiscountValid } from "@/lib/discount-calc";
import { createOrderSchema } from "@/lib/validations";
import { posCheckoutSchema } from "@/lib/validations";
import type { OrdersListQuery } from "@/lib/orders-list";
import { ORDERS_PAGE_SIZE } from "@/lib/orders-list";
import { OrderPaymentMethod, OrderStatus, Prisma } from "@prisma/client";

const ORDER_PATHS = [
  "/orders",
  "/orders/new",
  "/orders/pos",
  "/orders/pos/settings",
  "/",
  "/reports",
  "/inventory",
  "/yield",
  "/recipes",
];

function revalidateOrders() {
  for (const path of ORDER_PATHS) {
    revalidatePath(path);
  }
}

function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = Date.now().toString().slice(-6);
  return `ORD-${y}${m}${d}-${suffix}`;
}

export async function getOrdersByStatus() {
  const orders = await db.order.findMany({
    include: {
      customer: { select: { id: true, name: true } },
      lineItems: {
        include: {
          recipe: { select: { id: true, name: true, yieldUnit: true, barcode: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<OrderStatus, typeof orders> = {
    NEW: [],
    PROCESSING: [],
    READY: [],
    DELIVERED: [],
    CANCELLED: [],
  };

  for (const order of orders) {
    grouped[order.status].push(order);
  }

  return serializeForClient(grouped);
}

export async function getOrder(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
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
  const recipes = await db.recipe.findMany({
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
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [recipes, frequentGroups] = await Promise.all([
    db.recipe.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        salePrice: true,
        barcode: true,
        yieldUnit: true,
        imageUrl: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.orderLineItem.groupBy({
      by: ["recipeId"],
      where: {
        recipeId: { not: null },
        order: {
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
  const lineCount = parseInt(String(raw.lineCount || "0"), 10);
  const lines = [];

  for (let i = 0; i < lineCount; i++) {
    lines.push({
      recipeId: String(raw[`line_${i}_recipeId`] || ""),
      quantity: raw[`line_${i}_quantity`],
    });
  }

  const isPosCheckout = Boolean(raw.paymentMethod);
  const parsed = (isPosCheckout ? posCheckoutSchema : createOrderSchema).safeParse({
    customerId: raw.customerId || undefined,
    customerName: raw.customerName,
    discountCode: raw.discountCode,
    notes: raw.notes,
    paymentMethod: raw.paymentMethod || undefined,
    lines,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const recipeIds = parsed.data.lines.map((l) => l.recipeId);
  const recipes = await db.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: { id: true, salePrice: true, name: true },
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  for (const line of parsed.data.lines) {
    const recipe = recipeMap.get(line.recipeId);
    if (!recipe) {
      return { error: { lines: ["One or more recipes were not found"] } };
    }
    if (recipe.salePrice == null) {
      return {
        error: {
          lines: [`Set a sale price for "${recipe.name}" before ordering`],
        },
      };
    }
  }

  let customerId: string | null = parsed.data.customerId || null;
  let customerName = parsed.data.customerName?.trim() || null;

  if (customerId) {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { name: true },
    });
    if (customer) customerName = customer.name;
  }

  const linePayloads = parsed.data.lines.map((line) => {
    const recipe = recipeMap.get(line.recipeId)!;
    const unitSalePrice = Number(recipe.salePrice);
    return {
      recipeId: line.recipeId,
      recipeName: recipe.name,
      quantity: line.quantity,
      unitSalePrice,
      revenue: unitSalePrice * line.quantity,
    };
  });

  const subtotal = linePayloads.reduce((s, l) => s + l.revenue, 0);
  let discountId: string | null = null;
  let discountCode: string | null = null;
  let discountTotal = 0;

  const code = parsed.data.discountCode?.trim().toUpperCase();
  if (code) {
    const discount = await db.discount.findUnique({ where: { code } });
    if (!discount) {
      return { error: { discountCode: ["Invalid discount code"] } };
    }
    const d = {
      type: discount.type,
      value: Number(discount.value),
      minOrderAmount:
        discount.minOrderAmount != null ? Number(discount.minOrderAmount) : null,
      isActive: discount.isActive,
      validFrom: discount.validFrom,
      validTo: discount.validTo,
    };
    if (!isDiscountValid(d, subtotal)) {
      return {
        error: {
          discountCode: ["Discount not valid for this order"],
        },
      };
    }
    discountTotal = calculateDiscountAmount(d, subtotal);
    discountId = discount.id;
    discountCode = discount.code;
  }

  if (discountTotal > 0 && subtotal > 0) {
    const factor = (subtotal - discountTotal) / subtotal;
    for (const line of linePayloads) {
      line.revenue = Math.round(line.revenue * factor * 100) / 100;
    }
  }

  const paymentMethod = parsed.data.paymentMethod as OrderPaymentMethod | undefined;

  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId,
      customerName,
      discountId,
      discountCode,
      subtotal,
      discountTotal,
      paymentMethod: paymentMethod ?? null,
      paidAt: paymentMethod ? new Date() : null,
      notes: parsed.data.notes || null,
      status: OrderStatus.NEW,
      lineItems: { create: linePayloads },
    },
  });

  revalidateOrders();
  return { success: true, orderId: order.id, orderNumber: order.orderNumber };
}

/** POS register: create order only after payment method is selected at checkout. */
export async function createPosOrder(formData: FormData) {
  if (!formData.get("paymentMethod")) {
    return { error: { paymentMethod: ["Select Cash, Card, or PhonePe"] } };
  }
  return createOrder(formData);
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  NEW: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

/** Preview stock impact before marking processing → ready. */
export async function getOrderFulfillmentPreview(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      lineItems: {
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  ingredient: { include: { inventoryItems: true } },
                },
              },
            },
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
    const plan = planInventoryDeductions(line.recipe.ingredients, line.quantity);
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
            include: {
              ingredients: {
                include: {
                  ingredient: { include: { inventoryItems: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return { error: "Order not found" };
  }

  const allowed = STATUS_FLOW[order.status];
  if (!allowed.includes(nextStatus)) {
    return { error: `Cannot move from ${order.status} to ${nextStatus}` };
  }

  if (nextStatus === OrderStatus.READY && order.status === OrderStatus.PROCESSING) {
    const fulfillResult = await fulfillOrderInventory(order);
    if ("error" in fulfillResult) {
      return fulfillResult;
    }
  }

  const timestamps: Prisma.OrderUpdateInput = { status: nextStatus };

  if (nextStatus === OrderStatus.PROCESSING) {
    timestamps.processedAt = new Date();
  }
  if (nextStatus === OrderStatus.READY) {
    timestamps.readyAt = new Date();
  }
  if (nextStatus === OrderStatus.DELIVERED) {
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

type OrderForFulfillment = {
  lineItems: {
    id: string;
    recipeName: string;
    quantity: number;
    unitSalePrice: Prisma.Decimal;
    processedAt: Date | null;
    recipe: {
      ingredients: {
        quantityRequired: Prisma.Decimal;
        unit: import("@prisma/client").Unit;
        ingredient: {
          name: string;
          inventoryItems: {
            id: string;
            quantity: Prisma.Decimal;
            unit: import("@prisma/client").Unit;
            costPerUnit: Prisma.Decimal;
            isActive: boolean;
          }[];
        };
      }[];
    } | null;
  }[];
};

async function fulfillOrderInventory(order: OrderForFulfillment) {

  for (const line of order.lineItems) {
    if (line.processedAt) continue;

    if (!line.recipe) {
      return {
        error: `Cannot fulfill: recipe "${line.recipeName}" was removed from the catalog`,
      };
    }

    const plan = planInventoryDeductions(line.recipe.ingredients, line.quantity);
    if (!plan.ok) {
      return { error: plan.error };
    }

    await db.$transaction(async (tx) => {
      for (const consumption of plan.consumptions) {
        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: consumption.inventoryItemId },
        });
        const newQty = Number(item.quantity) - consumption.quantityDeducted;
        if (newQty < -0.0001) {
          throw new Error(`Stock conflict for ${item.name}`);
        }
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: Math.max(0, newQty) },
        });
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

function buildOrdersListWhere(filters: OrdersListQuery): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

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
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = ORDERS_PAGE_SIZE;
  const skip = (page - 1) * pageSize;
  const where = buildOrdersListWhere(filters);

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
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return serializeForClient({
    orders,
    total,
    page,
    pageSize,
    totalPages,
  });
}

export async function getOrderDashboardStats() {
  const [newCount, processingCount, readyCount, deliveredToday] = await Promise.all([
    db.order.count({ where: { status: OrderStatus.NEW } }),
    db.order.count({ where: { status: OrderStatus.PROCESSING } }),
    db.order.count({ where: { status: OrderStatus.READY } }),
    db.order.count({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return { newCount, processingCount, readyCount, deliveredToday };
}

export async function deleteOrder(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });
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
