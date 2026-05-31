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

  return db.expense.findMany({
    where,
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
  return db.expense.findUnique({ where: { id } });
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

  await db.expense.create({
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
