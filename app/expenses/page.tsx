import Link from "next/link";
import { getExpensesGroupedByMonth } from "@/app/actions/expenses";
import { getProfitLossSummary } from "@/app/actions/finance";
import { DuplicateMonthButton } from "@/components/expenses/DuplicateMonthButton";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Button } from "@/components/ui/Button";
import {
  currentPeriodMonth,
  formatPeriodMonthLabel,
  parsePeriodMonth,
  periodMonthToDateRange,
  toDateInputValue,
} from "@/lib/dates";
import { formatCurrency } from "@/lib/units";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  month?: string;
}>;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const periodMonth = parsePeriodMonth(params.month) ?? currentPeriodMonth();
  const { from, to } = periodMonthToDateRange(periodMonth);

  const [{ expenses, total }, periodSummary] = await Promise.all([
    getExpensesGroupedByMonth(periodMonth),
    getProfitLossSummary(toDateInputValue(from), toDateInputValue(to)),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-sm text-gray-500">
            Operating costs by accounting month (rent, salaries, etc.). Each expense
            counts toward P&amp;L in its assigned month, regardless of payment date.
          </p>
        </div>
        <Link href={`/expenses/new?month=${periodMonth}`}>
          <Button>Add expense</Button>
        </Link>
      </div>

      <div className="mb-6 filter-bar text-sm">
        <p className="text-gray-600">
          <span className="font-semibold text-servora-charcoal">
            {formatPeriodMonthLabel(periodMonth)}
          </span>{" "}
          expenses: {formatCurrency(total)} · P&amp;L operating expenses for this month:{" "}
          <span className="font-semibold">{formatCurrency(periodSummary.operatingExpenses)}</span>
        </p>
        <Link href="/" className="mt-1 inline-block link-brand">
          View full P&amp;L on dashboard →
        </Link>
      </div>

      <form
        method="get"
        action="/expenses"
        className="mb-4 flex flex-wrap items-end gap-3 card-padded"
      >
        <div>
          <label htmlFor="month" className="mb-1 block text-xs font-medium text-gray-500">
            Accounting month
          </label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={periodMonth}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit">View month</Button>
        <DuplicateMonthButton periodMonth={periodMonth} />
      </form>

      <ExpenseTable expenses={expenses} />
    </div>
  );
}
