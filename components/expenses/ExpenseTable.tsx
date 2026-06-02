"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteExpense } from "@/app/actions/expenses";
import { Button } from "@/components/ui/Button";
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
        Total: <span className="font-semibold text-servora-charcoal">{formatCurrency(total)}</span>
      </p>
      <div className="table-panel">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Month
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Paid
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {formatPeriodMonthLabel(expense.periodMonth)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {expense.expenseDate
                    ? new Date(expense.expenseDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">{expenseCategoryLabel(expense.category)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-servora-charcoal">{expense.description}</div>
                  {expense.notes && (
                    <div className="text-xs text-gray-500">{expense.notes}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(expense.amount))}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/expenses/${expense.id}/edit`}>
                      <Button variant="ghost" className="px-2 py-1 text-xs">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-xs"
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
      </div>
    </div>
  );
}
