import Link from "next/link";
import { notFound } from "next/navigation";
import { getExpense, updateExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function EditExpensePage({ params }: Props) {
  const expense = await getExpense(params.id);
  if (!expense) notFound();

  const action = updateExpense.bind(null, params.id);

  return (
    <div>
      <Link href="/expenses" className="text-sm text-servora-yellow hover:underline">
        ← Back to expenses
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Edit expense</h1>
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
