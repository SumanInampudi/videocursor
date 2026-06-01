"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { customerSchema } from "@/lib/validations";
import { OrderStatus } from "@prisma/client";

const PATHS = ["/customers", "/orders", "/orders/new", "/"];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export async function getCustomers(search?: string) {
  const rows = await db.customer.findMany({ orderBy: { name: "asc" } });
  if (!search?.trim()) return serializeForClient(rows);

  const q = search.toLowerCase();
  return serializeForClient(
    rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  );
}

export async function getCustomer(id: string) {
  const customer = await db.customer.findUnique({ where: { id } });
  return customer ? serializeForClient(customer) : null;
}

export async function getCustomerInsights(id: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: OrderStatus.DELIVERED },
        include: {
          lineItems: { select: { revenue: true, quantity: true, recipeName: true } },
        },
        orderBy: { deliveredAt: "desc" },
      },
    },
  });

  if (!customer) return null;

  const delivered = customer.orders;
  const orderCount = delivered.length;
  const totalRevenue = delivered.reduce(
    (sum, o) =>
      sum +
      o.lineItems.reduce((s, l) => s + Number(l.revenue ?? 0), 0) -
      Number(o.discountTotal ?? 0),
    0
  );
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  const lastOrderAt = delivered[0]?.deliveredAt ?? null;
  const firstOrderAt =
    delivered.length > 0 ? delivered[delivered.length - 1]?.deliveredAt ?? null : null;

  const daysSinceLast =
    lastOrderAt != null
      ? Math.floor((Date.now() - lastOrderAt.getTime()) / 86_400_000)
      : null;

  let segment: "vip" | "repeat" | "new" | "inactive" = "new";
  if (orderCount >= 10 || totalRevenue >= 50000) segment = "vip";
  else if (orderCount >= 2) segment = "repeat";
  if (daysSinceLast != null && daysSinceLast > 30 && orderCount > 0) segment = "inactive";

  const ordersPerMonth =
    firstOrderAt && lastOrderAt && orderCount > 1
      ? orderCount /
        Math.max(
          1,
          (lastOrderAt.getTime() - firstOrderAt.getTime()) / (30 * 86_400_000)
        )
      : orderCount;

  const predictedNextOrderDays =
    daysSinceLast != null && ordersPerMonth > 0
      ? Math.max(0, Math.round(30 / ordersPerMonth) - daysSinceLast)
      : null;

  return serializeForClient({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      createdAt: customer.createdAt,
    },
    stats: {
      orderCount,
      totalRevenue,
      avgOrderValue,
      lastOrderAt,
      firstOrderAt,
      daysSinceLast,
      segment,
      ordersPerMonth: Math.round(ordersPerMonth * 10) / 10,
      predictedNextOrderDays,
    },
    recentOrders: delivered.slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      deliveredAt: o.deliveredAt,
      revenue:
        o.lineItems.reduce((s, l) => s + Number(l.revenue ?? 0), 0) -
        Number(o.discountTotal ?? 0),
    })),
  });
}

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const customer = await db.customer.create({ data: parsed.data });
  revalidate();
  return { success: true, customerId: customer.id };
}

export async function updateCustomer(id: string, formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  await db.customer.update({ where: { id }, data: parsed.data });
  revalidate();
  return { success: true };
}

export async function getCustomerOptions() {
  return getCustomers();
}
