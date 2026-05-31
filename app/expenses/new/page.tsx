import Link from "next/link";
import { createExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { currentPeriodMonth, parsePeriodMonth } from "@/lib/dates";

type Props = { searchParams: { month?: string } };

export default function NewExpensePage({ searchParams }: Props) {
  const periodMonth = parsePeriodMonth(searchParams.month) ?? currentPeriodMonth();

  return (
    <div>
      <Link href="/expenses" className="text-sm text-servora-yellow hover:underline">
        ← Back to expenses
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Add expense</h1>
      <p className="mb-6 text-sm text-gray-500">
        Choose the accounting month this cost belongs to (e.g. May rent → May). Payment
        date is optional.
      </p>
      <ExpenseForm action={createExpense} defaultPeriodMonth={periodMonth} />
    </div>
  );
}
