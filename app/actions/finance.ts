"use server";

import { db } from "@/lib/db";
import {
  endOfDay,
  parseDateParam,
  periodMonthsInRange,
  startOfDay,
} from "@/lib/dates";
import { aggregateProfitLoss } from "@/lib/finance";
import { OrderStatus } from "@prisma/client";

export async function getProfitLossSummary(fromParam?: string, toParam?: string) {
  const today = new Date();
  const from = startOfDay(parseDateParam(fromParam, today));
  const to = endOfDay(parseDateParam(toParam, parseDateParam(fromParam, today)));

  const periodMonths = periodMonthsInRange(from, to);

  const [lineItems, expenses, orderCount] = await Promise.all([
    db.orderLineItem.findMany({
      where: {
        processedAt: { not: null },
        order: {
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: from, lte: to },
        },
      },
      select: {
        revenue: true,
        ingredientCost: true,
        profit: true,
      },
    }),
    db.expense.findMany({
      where: {
        periodMonth: { in: periodMonths },
      },
      select: { category: true, amount: true, periodMonth: true },
    }),
    db.order.count({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: from, lte: to },
      },
    }),
  ]);

  const summary = aggregateProfitLoss({
    from,
    to,
    lineItems,
    expenses,
    orderCount,
  });

  return { ...summary, periodMonths };
}

export async function getDailyProfitHistory(days = 30) {
  const end = endOfDay(new Date());
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - (days - 1));

  const [lineItems, expenses] = await Promise.all([
    db.orderLineItem.findMany({
      where: {
        processedAt: { not: null },
        order: {
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: start, lte: end },
        },
      },
      select: {
        revenue: true,
        ingredientCost: true,
        profit: true,
        order: { select: { deliveredAt: true } },
      },
    }),
    db.expense.findMany({
      where: { periodMonth: { in: periodMonthsInRange(start, end) } },
      select: { amount: true, periodMonth: true },
    }),
  ]);

  const dayMap = new Map<
    string,
    { revenue: number; grossProfit: number; expenses: number }
  >();

  function dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dayMap.set(dayKey(d), { revenue: 0, grossProfit: 0, expenses: 0 });
  }

  for (const line of lineItems) {
    const deliveredAt = line.order.deliveredAt;
    if (!deliveredAt) continue;
    const key = dayKey(deliveredAt);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(line.revenue ?? 0);
    bucket.grossProfit += Number(line.profit ?? 0);
  }

  for (const expense of expenses) {
    const key = `${expense.periodMonth}-01`;
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.expenses += Number(expense.amount);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({
      date,
      revenue: totals.revenue,
      grossProfit: totals.grossProfit,
      expenses: totals.expenses,
      netProfit: totals.grossProfit - totals.expenses,
    }));
}
