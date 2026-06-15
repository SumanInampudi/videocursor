import Link from "next/link";
import { notFound } from "next/navigation";
import { getExpense, updateExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditExpensePage({ params }: Props) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  const action = updateExpense.bind(null, id);

  return (
    <div>
      <Link href="/expenses" className="link-brand text-sm">
        ← Back to expenses
      </Link>
      <h1 className="mt-2 page-title">Edit expense</h1>
      <div className="mt-6">
        <ExpenseForm
          action={action}
          initialData={{
            category: expense.category,
            description: expense.description,
            amount: Number(expense.amount),
            periodMonth: expense.periodMonth,
            expenseDate: expense.expenseDate,
            notes: expense.notes,
          }}
          submitLabel="Update expense"
        />
      </div>
    </div>
  );
}
