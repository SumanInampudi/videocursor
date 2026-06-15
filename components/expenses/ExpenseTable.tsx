"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteExpense } from "@/app/actions/expenses";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { expenseCategoryLabel } from "@/lib/expenseCategories";
import { formatPeriodMonthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/units";
import { Expense } from "@prisma/client";

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, description: string) {
    if (!confirm(`Delete expense "${description}"?`)) return;
    startTransition(async () => {
      await deleteExpense(id);
      router.refresh();
    });
  }

  if (expenses.length === 0) {
    return (
      <div className="empty-state text-sm text-gray-500">
        No expenses in this period.{" "}
        <Link href="/expenses/new" className="link-brand">
          Add one
        </Link>
      </div>
    );
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <p className="mb-3 text-sm text-gray-600">
        Total: <span className="font-semibold text-charcoal">{formatCurrency(total)}</span>
      </p>
      <DataTable>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Paid</th>
              <th>Category</th>
              <th>Description</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="font-medium">{formatPeriodMonthLabel(expense.periodMonth)}</td>
                <td className="text-muted">
                  {expense.expenseDate
                    ? new Date(expense.expenseDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="text-muted">{expenseCategoryLabel(expense.category)}</td>
                <td>
                  <div className="font-medium">{expense.description}</div>
                  {expense.notes && (
                    <div className="text-xs text-gray-400">{expense.notes}</div>
                  )}
                </td>
                <td className="text-right font-medium tabular-nums">
                  {formatCurrency(Number(expense.amount))}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-0.5">
                    <Link href={`/expenses/${expense.id}/edit`}>
                      <Button variant="ghost" className="px-2 py-1 text-xs">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                      disabled={isPending}
                      onClick={() => handleDelete(expense.id, expense.description)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
