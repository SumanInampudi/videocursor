import Link from "next/link";
import { createExpense } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { currentPeriodMonth, parsePeriodMonth } from "@/lib/dates";

type Props = { searchParams: Promise<{ month?: string }> };

export default async function NewExpensePage({ searchParams }: Props) {
  const params = await searchParams;
  const periodMonth = parsePeriodMonth(params.month) ?? currentPeriodMonth();

  return (
    <div>
      <Link href="/expenses" className="link-brand text-sm">
        ← Back to expenses
      </Link>
      <h1 className="mt-2 page-title">Add expense</h1>
      <p className="mb-6 text-sm text-gray-500">
        Choose the accounting month this cost belongs to (e.g. May rent → May). Payment
        date is optional.
      </p>
      <ExpenseForm action={createExpense} defaultPeriodMonth={periodMonth} />
    </div>
  );
}
