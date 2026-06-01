"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { planInventoryDeductions } from "@/lib/orderFulfillment";
import { createOrderSchema } from "@/lib/validations";
import { OrderStatus, Prisma } from "@prisma/client";

const ORDER_PATHS = [
  "/orders",
  "/orders/new",
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

  return grouped;
}

export async function getOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
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
}

export async function getRecipesForOrdering() {
  return db.recipe.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      salePrice: true,
      barcode: true,
      yieldUnit: true,
      yieldQuantity: true,
    },
    orderBy: { name: "asc" },
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

  const parsed = createOrderSchema.safeParse({
    customerName: raw.customerName,
    notes: raw.notes,
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

  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: parsed.data.customerName || null,
      notes: parsed.data.notes || null,
      status: OrderStatus.NEW,
      lineItems: {
        create: parsed.data.lines.map((line) => {
          const recipe = recipeMap.get(line.recipeId)!;
          const unitSalePrice = Number(recipe.salePrice);
          return {
            recipeId: line.recipeId,
            recipeName: recipe.name,
            quantity: line.quantity,
            unitSalePrice,
            revenue: unitSalePrice * line.quantity,
          };
        }),
      },
    },
  });

  revalidateOrders();
  return { success: true, orderId: order.id };
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  NEW: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

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
    await db.order.delete({
      where: { id: orderId },
    });
    revalidateOrders();
    return { success: true, message: "Order deleted successfully." };
  } catch (error) {
    console.error("Error deleting order:", error);
    return { success: false, message: "Failed to delete order." };
  }
}
