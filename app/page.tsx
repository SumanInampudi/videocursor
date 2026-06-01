import Link from "next/link";
import { Suspense } from "react";
import { getDailyProfitHistory, getProfitLossSummary } from "@/app/actions/finance";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ProfitHistoryTable } from "@/components/dashboard/ProfitHistoryTable";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { Button } from "@/components/ui/Button";
import { defaultReportDateRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  from?: string;
  to?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const defaults = defaultReportDateRange();
  const from = params.from ?? defaults.from;
  const to = params.to ?? defaults.to;

  const [summary, history] = await Promise.all([
    getProfitLossSummary(from, to),
    getDailyProfitHistory(from, to),
  ]);

  const isCurrentMonth =
    from === defaults.from && to === defaults.to && !params.from && !params.to;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {isCurrentMonth
              ? "This month: delivered order profit minus operating expenses for matching accounting months"
              : "Profit & margins for the selected date range"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/orders/new">
            <Button>Place order</Button>
          </Link>
          <Link href="/expenses/new">
            <Button variant="secondary">Add expense</Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<div className="mb-6 h-16 animate-pulse rounded-lg bg-gray-100" />}>
        <div className="mb-6">
          <DateRangePicker from={from} to={to} actionPath="/" />
        </div>
      </Suspense>

      <ProfitLossPanel summary={summary} />

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-servora-charcoal">Daily history</h2>
          <Link href="/reports" className="text-sm text-servora-yellow hover:underline">
            Full reports →
          </Link>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Uses the same date range as the summary above. Monthly operating expenses appear on
          the 1st of their accounting month.
        </p>
        <ProfitHistoryTable rows={history} />
      </section>
    </div>
  );
}
