"use server";

import { db } from "@/lib/db";
import {
  defaultReportDateRange,
  endOfDay,
  parseDateInputValue,
  periodMonthToDateRange,
  periodMonthsInRange,
  startOfDay,
  toLocalDayKey,
} from "@/lib/dates";
import { aggregateProfitLoss } from "@/lib/finance";
import { OrderStatus } from "@prisma/client";

function resolveReportRange(fromParam?: string, toParam?: string) {
  const defaults = defaultReportDateRange();
  const fallbackFrom = parseDateInputValue(defaults.from, new Date());
  const fallbackTo = parseDateInputValue(defaults.to, new Date());

  const from = parseDateInputValue(fromParam, fallbackFrom);
  const to = endOfDay(parseDateInputValue(toParam ?? fromParam, fallbackTo));

  if (from.getTime() > to.getTime()) {
    return { from: parseDateInputValue(toParam, fallbackTo), to: endOfDay(from) };
  }

  return { from, to };
}

export async function getProfitLossSummary(
  fromParam?: string,
  toParam?: string,
  prorateExpenses = false
) {
  const { from, to } = resolveReportRange(fromParam, toParam);
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
    prorateExpenses,
  });

  return { ...summary, periodMonths };
}

export async function getDailyProfitHistory(fromParam?: string, toParam?: string) {
  const { from, to } = resolveReportRange(fromParam, toParam);

  const [lineItems, expenses] = await Promise.all([
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
        order: { select: { deliveredAt: true } },
      },
    }),
    db.expense.findMany({
      where: { periodMonth: { in: periodMonthsInRange(from, to) } },
      select: { amount: true, periodMonth: true },
    }),
  ]);

  const dayMap = new Map<
    string,
    { revenue: number; grossProfit: number; expenses: number }
  >();

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    dayMap.set(toLocalDayKey(d), { revenue: 0, grossProfit: 0, expenses: 0 });
  }

  for (const line of lineItems) {
    const deliveredAt = line.order.deliveredAt;
    if (!deliveredAt) continue;
    const key = toLocalDayKey(deliveredAt);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(line.revenue ?? 0);
    const lineProfit =
      line.profit != null
        ? Number(line.profit)
        : line.revenue != null && line.ingredientCost != null
          ? Number(line.revenue) - Number(line.ingredientCost)
          : 0;
    bucket.grossProfit += lineProfit;
  }

  for (const expense of expenses) {
    const { from: monthStart } = periodMonthToDateRange(expense.periodMonth);
    const key = toLocalDayKey(monthStart);
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

/** Prior period of same length immediately before `from`. */
export async function getProfitLossComparison(
  fromParam?: string,
  toParam?: string,
  prorateExpenses = false
) {
  const { from, to } = resolveReportRange(fromParam, toParam);
  const spanMs = to.getTime() - from.getTime();
  const prevTo = endOfDay(new Date(from.getTime() - 86_400_000));
  const prevFrom = startOfDay(new Date(prevTo.getTime() - spanMs));

  const periodMonths = periodMonthsInRange(prevFrom, prevTo);

  const [lineItems, expenses, orderCount] = await Promise.all([
    db.orderLineItem.findMany({
      where: {
        processedAt: { not: null },
        order: {
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: prevFrom, lte: prevTo },
        },
      },
      select: { revenue: true, ingredientCost: true, profit: true },
    }),
    db.expense.findMany({
      where: { periodMonth: { in: periodMonths } },
      select: { category: true, amount: true, periodMonth: true },
    }),
    db.order.count({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: prevFrom, lte: prevTo },
      },
    }),
  ]);

  return aggregateProfitLoss({
    from: prevFrom,
    to: prevTo,
    lineItems,
    expenses,
    orderCount,
    prorateExpenses,
  });
}

