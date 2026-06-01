import "server-only";

import type { Prisma } from "@prisma/client";
import { toDateInputValue, toPeriodMonth } from "@/lib/dates";
import { ExpenseCategory } from "@prisma/client";

const DAILY_EXPENSE_PREFIX = "Stock receive (daily)";

export type StockReceiveFinanceInput = {
  businessId: string;
  purchaseDate: Date;
  grandTotal: number;
  amountPaid: number;
  supplierName: string | null;
  lineCount: number;
  invoiceRef?: string | null;
  headerNote?: string | null;
};

/** Record cash paid as SUPPLIES expense, rolled up by calendar day. */
export async function recordStockReceiveExpense(
  tx: Prisma.TransactionClient,
  input: StockReceiveFinanceInput
) {
  const { amountPaid, purchaseDate, businessId } = input;
  if (amountPaid <= 0.0001) return;

  const expenseDate = new Date(purchaseDate);
  expenseDate.setHours(0, 0, 0, 0);
  const periodMonth = toPeriodMonth(expenseDate);
  const dayLabel = toDateInputValue(expenseDate);

  const detail = [
    input.supplierName ? `Supplier: ${input.supplierName}` : null,
    `${input.lineCount} line(s)`,
    input.invoiceRef ? `Ref: ${input.invoiceRef}` : null,
    input.headerNote || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const existing = await tx.expense.findFirst({
    where: {
      businessId,
      category: ExpenseCategory.SUPPLIES,
      expenseDate,
      description: DAILY_EXPENSE_PREFIX,
    },
  });

  if (existing) {
    const prevNotes = existing.notes?.trim() ?? "";
    const addNote = `+${amountPaid.toFixed(2)} on ${dayLabel}${detail ? ` (${detail})` : ""}`;
    await tx.expense.update({
      where: { id: existing.id },
      data: {
        amount: Number(existing.amount) + amountPaid,
        notes: prevNotes ? `${prevNotes}\n${addNote}` : addNote,
      },
    });
    return;
  }

  await tx.expense.create({
    data: {
      businessId,
      category: ExpenseCategory.SUPPLIES,
      description: DAILY_EXPENSE_PREFIX,
      amount: amountPaid,
      periodMonth,
      expenseDate,
      notes: detail || `Stock receive total ${input.grandTotal.toFixed(2)}`,
    },
  });
}
