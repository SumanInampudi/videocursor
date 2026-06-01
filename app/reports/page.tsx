import Link from "next/link";
import { Suspense } from "react";
import { getDailyProfitHistory, getProfitLossSummary } from "@/app/actions/finance";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ProfitHistoryTable } from "@/components/dashboard/ProfitHistoryTable";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { defaultReportDateRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  from?: string;
  to?: string;
}>;

export default async function ReportsPage({
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

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm text-servora-yellow hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">
          Profit & loss reports
        </h1>
        <p className="text-sm text-gray-500">
          Sales by delivery date; expenses by accounting month (rent, payroll, etc.).
        </p>
      </div>

      <Suspense fallback={<div className="mb-6 h-16 animate-pulse rounded-lg bg-gray-100" />}>
        <div className="mb-6">
          <DateRangePicker
            from={from}
            to={to}
            actionPath="/reports"
            defaultPreset="last3months"
          />
        </div>
      </Suspense>

      <ProfitLossPanel summary={summary} />

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-servora-charcoal">Day by day</h2>
        <p className="mb-3 text-xs text-gray-500">
          Same date range as above. Monthly operating expenses appear on the 1st of their
          accounting month; net profit on that day includes the full month&apos;s overhead.
        </p>
        <ProfitHistoryTable rows={history} />
      </section>
    </div>
  );
}
