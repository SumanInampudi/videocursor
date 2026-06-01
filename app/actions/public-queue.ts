"use server";

import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import {
  buildPublicQueueTicket,
  estimatePrepForLineItems,
  sortPublicQueueTickets,
  type PublicQueueTicket,
} from "@/lib/public-order-queue";
import { ACTIVE_ORDER_STATUSES } from "@/lib/order-pipeline";

export async function getBusinessBySlug(slug: string) {
  const business = await db.business.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  return business ? serializeForClient(business) : null;
}

export async function getPublicOrderQueue(businessSlug: string) {
  const business = await db.business.findFirst({
    where: { slug: businessSlug, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!business) {
    return { error: "Venue not found" as const };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: {
      businessId: business.id,
      status: { in: ACTIVE_ORDER_STATUSES },
      createdAt: { gte: todayStart },
    },
    select: {
      orderNumber: true,
      status: true,
      channel: true,
      customerName: true,
      tableLabel: true,
      createdAt: true,
      processedAt: true,
      packingAt: true,
      readyAt: true,
      lineItems: {
        select: {
          quantity: true,
          kitchenDoneQty: true,
          recipe: { select: { prepTimeMinutes: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const tickets: PublicQueueTicket[] = [];
  for (const order of orders) {
    const estimatedPrepMinutes = estimatePrepForLineItems(order.lineItems);
    const ticket = buildPublicQueueTicket({
      ...order,
      estimatedPrepMinutes,
    });
    if (ticket) tickets.push(ticket);
  }

  const sortedTickets = sortPublicQueueTickets(tickets);

  return serializeForClient({
    businessName: business.name,
    businessSlug: business.slug,
    tickets: sortedTickets,
    updatedAt: new Date().toISOString(),
  });
}
