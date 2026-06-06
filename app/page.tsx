import Link from "next/link";
import { Suspense } from "react";
import { getLowStockItems } from "@/app/actions/dashboard";
import { getSetupProgress } from "@/app/actions/setup";
import {
  getDailyProfitHistory,
  getProfitLossComparison,
  getProfitLossSummary,
} from "@/app/actions/finance";
import { DashboardPayables } from "@/components/dashboard/DashboardPayables";
import { DashboardLowStock } from "@/components/dashboard/DashboardLowStock";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ProrateToggle } from "@/components/dashboard/ProrateToggle";
import { ProfitComparison } from "@/components/dashboard/ProfitComparison";
import { ProfitHistoryTable } from "@/components/dashboard/ProfitHistoryTable";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAuthContext } from "@/lib/auth";
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
  const { roles } = await getAuthContext();

  const [summary, history, comparison, lowStock, setup] = await Promise.all([
    getProfitLossSummary(from, to, prorate),
    getDailyProfitHistory(from, to),
    getProfitLossComparison(from, to, prorate),
    getLowStockItems(),
    getSetupProgress(),
  ]);

  const isCurrentMonth =
    from === defaults.from && to === defaults.to && !params.from && !params.to;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          isCurrentMonth
            ? "This month · times shown in IST where applicable"
            : "Profit & margins for the selected date range"
        }
        actions={
          <>
            <Link href="/orders/pos">
              <Button>POS register</Button>
            </Link>
            <Link href="/expenses/new">
              <Button variant="secondary">Add expense</Button>
            </Link>
          </>
        }
      />

      <DashboardQuickActions userRoles={roles} />

      {!setup.isComplete && (
        <SetupChecklist
          steps={setup.steps}
          completedCount={setup.completedCount}
          totalCount={setup.totalCount}
        />
      )}

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
        <div className="space-y-4">
          <DashboardPayables />
          <DashboardLowStock items={lowStock} />
        </div>
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
          <h2 className="section-title">Daily history</h2>
          <Link href="/reports" className="link-brand text-sm">
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
