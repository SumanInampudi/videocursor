import Link from "next/link";
import { Suspense } from "react";
import {
  getDailyProfitHistory,
  getProfitLossComparison,
  getProfitLossSummary,
} from "@/app/actions/finance";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import { ProrateToggle } from "@/components/dashboard/ProrateToggle";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { ProfitComparison } from "@/components/dashboard/ProfitComparison";
import { ProfitHistoryTable } from "@/components/dashboard/ProfitHistoryTable";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { defaultReportDateRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  prorate?: string;
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
  const prorate = params.prorate === "1";

  const [summary, history, comparison] = await Promise.all([
    getProfitLossSummary(from, to, prorate),
    getDailyProfitHistory(from, to),
    getProfitLossComparison(from, to, prorate),
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
          Sales by delivery date; expenses by accounting month. Export for your accountant.
        </p>
      </div>

      <Suspense fallback={<div className="mb-6 h-16 animate-pulse rounded-lg bg-gray-100" />}>
        <div className="mb-3">
          <DateRangePicker
            from={from}
            to={to}
            actionPath="/reports"
            defaultPreset="last3months"
          />
        </div>
      </Suspense>
      <Suspense fallback={null}>
        <div className="mb-6">
          <ProrateToggle enabled={prorate} actionPath="/reports" />
        </div>
      </Suspense>

      <div className="mb-4 flex justify-end">
        <ExportReportButton rows={history} filename={`pl-report-${from}-${to}.csv`} />
      </div>

      <ProfitComparison
        current={{
          revenue: summary.revenue,
          grossProfit: summary.grossProfit,
          netProfit: summary.netProfit,
        }}
        previous={{
          revenue: comparison.revenue,
          grossProfit: comparison.grossProfit,
          netProfit: comparison.netProfit,
        }}
      />

      <ProfitLossPanel summary={summary} />

      <section className="mt-8">
        <ProfitChart rows={history} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-servora-charcoal">Day by day</h2>
        <ProfitHistoryTable rows={history} />
      </section>
    </div>
  );
}
