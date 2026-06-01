import Link from "next/link";
import { Suspense } from "react";
import { getLowStockItems } from "@/app/actions/dashboard";
import {
  getDailyProfitHistory,
  getProfitLossComparison,
  getProfitLossSummary,
} from "@/app/actions/finance";
import { DashboardLowStock } from "@/components/dashboard/DashboardLowStock";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ProrateToggle } from "@/components/dashboard/ProrateToggle";
import { ProfitComparison } from "@/components/dashboard/ProfitComparison";
import { ProfitHistoryTable } from "@/components/dashboard/ProfitHistoryTable";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { Button } from "@/components/ui/Button";
import { getServerRoles } from "@/lib/auth";
import { defaultReportDateRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  prorate?: string;
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
  const prorate = params.prorate === "1";
  const roles = getServerRoles();

  const [summary, history, comparison, lowStock] = await Promise.all([
    getProfitLossSummary(from, to, prorate),
    getDailyProfitHistory(from, to),
    getProfitLossComparison(from, to, prorate),
    getLowStockItems(),
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
              ? "This month · times shown in IST where applicable"
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

      <DashboardQuickActions userRoles={roles} />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-gray-100" />}>
            <div className="mb-3">
              <DateRangePicker from={from} to={to} actionPath="/" />
            </div>
          </Suspense>
          <Suspense fallback={null}>
            <div className="mt-3">
              <ProrateToggle enabled={prorate} actionPath="/" />
            </div>
          </Suspense>
        </div>
        <DashboardLowStock items={lowStock} />
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

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-servora-charcoal">Daily history</h2>
          <Link href="/reports" className="text-sm text-servora-yellow hover:underline">
            Full reports →
          </Link>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Same date range as the summary. Monthly operating expenses appear on the 1st of their
          accounting month (IST).
        </p>
        <ProfitHistoryTable rows={history} />
      </section>
    </div>
  );
}
