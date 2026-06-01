"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  currentPeriodMonth,
  endOfDay,
  parsePeriodMonth,
  periodMonthsInRange,
  startOfDay,
} from "@/lib/dates";
import { serializeForClient } from "@/lib/serialize";
import { expenseSchema } from "@/lib/validations";
import { ExpenseCategory } from "@prisma/client";

const EXPENSE_PATHS = ["/expenses", "/expenses/new", "/", "/reports"];

function revalidateExpenses() {
  for (const path of EXPENSE_PATHS) {
    revalidatePath(path);
  }
}

export async function getExpenses(filters?: {
  periodMonth?: string;
  from?: string;
  to?: string;
  category?: string;
}) {
  const where: {
    periodMonth?: string | { in: string[] };
    category?: ExpenseCategory;
  } = {};

  const parsedMonth = parsePeriodMonth(filters?.periodMonth);
  if (parsedMonth) {
    where.periodMonth = parsedMonth;
  } else if (filters?.from || filters?.to) {
    const from = startOfDay(filters.from ? new Date(filters.from) : new Date(0));
    const to = endOfDay(filters.to ? new Date(filters.to) : new Date());
    where.periodMonth = { in: periodMonthsInRange(from, to) };
  }

  if (filters?.category) {
    where.category = filters.category as ExpenseCategory;
  }

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  return db.expense.findMany({
    where: { ...where, businessId },
    orderBy: [{ periodMonth: "desc" }, { createdAt: "desc" }],
  });
}

export async function getExpensesGroupedByMonth(periodMonth?: string) {
  const month = parsePeriodMonth(periodMonth) ?? currentPeriodMonth();
  const expenses = await getExpenses({ periodMonth: month });
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  return { periodMonth: month, expenses, total };
}

export async function getExpense(id: string) {
  const expense = await db.expense.findUnique({ where: { id } });
  return expense ? serializeForClient(expense) : null;
}

export async function createExpense(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const paidOn =
    data.expenseDate && data.expenseDate.trim() !== ""
      ? new Date(data.expenseDate)
      : null;

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  await db.expense.create({
    data: {
      businessId,
      category: data.category as ExpenseCategory,
      description: data.description,
      amount: data.amount,
      periodMonth: data.periodMonth,
      expenseDate: paidOn,
      notes: data.notes || null,
    },
  });

  revalidateExpenses();
  return { success: true };
}

export async function updateExpense(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const paidOn =
    data.expenseDate && data.expenseDate.trim() !== ""
      ? new Date(data.expenseDate)
      : null;

  await db.expense.update({
    where: { id },
    data: {
      category: data.category as ExpenseCategory,
      description: data.description,
      amount: data.amount,
      periodMonth: data.periodMonth,
      expenseDate: paidOn,
      notes: data.notes || null,
    },
  });

  revalidateExpenses();
  return { success: true };
}

export async function deleteExpense(id: string) {
  await db.expense.delete({ where: { id } });
  revalidateExpenses();
  return { success: true };
}

/** Copy all expenses from the previous calendar month into target month. */
export async function duplicateExpensesFromPreviousMonth(targetPeriodMonth: string) {
  const parsed = parsePeriodMonth(targetPeriodMonth);
  if (!parsed) {
    return { error: "Invalid period month" };
  }

  const [year, month] = parsed.split("-").map(Number);
  const prevDate = new Date(year!, month! - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const source = await db.expense.findMany({
    where: { businessId, periodMonth: prevMonth },
  });
  if (source.length === 0) {
    return { error: `No expenses found for ${prevMonth}` };
  }

  let created = 0;
  for (const e of source) {
    const exists = await db.expense.findFirst({
      where: {
        businessId,
        periodMonth: parsed,
        category: e.category,
        description: e.description,
      },
    });
    if (exists) continue;

    await db.expense.create({
      data: {
        businessId,
        category: e.category,
        description: e.description,
        amount: e.amount,
        periodMonth: parsed,
        notes: e.notes ? `Copied from ${prevMonth}: ${e.notes}` : `Copied from ${prevMonth}`,
      },
    });
    created += 1;
  }

  revalidateExpenses();
  return { success: true, created, fromMonth: prevMonth };
}
