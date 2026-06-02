import Link from "next/link";
import { ProfitLossSummary } from "@/lib/finance";
import { expenseCategoryLabel } from "@/lib/expenseCategories";
import { formatPeriodMonthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/units";

type ProfitLossPanelProps = {
  summary: ProfitLossSummary;
  showExpenseBreakdown?: boolean;
};

export function ProfitLossPanel({
  summary,
  showExpenseBreakdown = true,
}: ProfitLossPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Revenue (delivered)" value={formatCurrency(summary.revenue)} />
        <MetricCard
          label="Total costs"
          value={formatCurrency(summary.totalCosts)}
          sub="Ingredient COGS + operating expenses"
        />
        <MetricCard
          label="Net profit / loss"
          value={formatCurrency(summary.netProfit)}
          highlight={summary.netProfit < 0 ? "danger" : "success"}
          sub={
            summary.netMarginPercent != null
              ? `${summary.netMarginPercent.toFixed(1)}% of revenue`
              : undefined
          }
        />
        <MetricCard
          label="Gross profit"
          value={formatCurrency(summary.grossProfit)}
          sub={
            summary.grossMarginPercent != null
              ? `${summary.grossMarginPercent.toFixed(1)}% before rent & payroll`
              : "After ingredient COGS only"
          }
        />
      </div>

      <section className="card-padded">
        <h3 className="section-title mb-4">
          Where your money went
        </h3>
        <div className="space-y-3 text-sm">
          <CostRow
            label="Cost of goods sold (COGS)"
            description="Ingredients used on delivered orders (from inventory when orders marked ready)"
            amount={summary.cogs}
          />
          <CostRow
            label="Operating expenses"
            description="Rent, salaries, utilities, etc. (accounting month)"
            amount={summary.operatingExpenses}
            href="/expenses"
          />
          <div className="border-t border-gray-100 pt-3">
            <CostRow
              label="Total costs"
              description="COGS + operating expenses"
              amount={summary.totalCosts}
              bold
            />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-semibold text-servora-charcoal">Revenue</p>
                <p className="text-xs text-gray-500">{summary.orderCount} delivered orders</p>
              </div>
              <p className="font-semibold">{formatCurrency(summary.revenue)}</p>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <p className="font-semibold text-servora-charcoal">Net profit / loss</p>
              <p
                className={`font-bold ${
                  summary.netProfit < 0 ? "text-servora-red" : "text-green-700"
                }`}
              >
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
          </div>
        </div>
        {summary.periodMonths && summary.periodMonths.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            Operating expenses counted for:{" "}
            {summary.periodMonths.map((m) => formatPeriodMonthLabel(m)).join(", ")}
          </p>
        )}
      </section>

      {showExpenseBreakdown && summary.expensesByCategory.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Operating expenses by category
          </h3>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {summary.expensesByCategory.map((row) => (
              <li
                key={row.category}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>{expenseCategoryLabel(row.category)}</span>
                <span className="font-medium">{formatCurrency(row.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-md bg-blue-50 p-3 text-xs text-blue-900">
        <strong>Net profit</strong> = gross profit from delivered orders in this date range
        minus operating expenses
        {summary.expensesProrated
          ? " (prorated to days in range)."
          : " (full amount for each overlapping accounting month). "}
        <strong>COGS is not duplicated in Expenses.</strong>{" "}
        Supplier credit for stock is tracked under{" "}
        <Link href="/inventory/payables" className="font-medium underline">
          Inventory → Payables
        </Link>
        .
      </p>

      {summary.revenue === 0 && summary.totalCosts === 0 && (
        <p className="text-sm text-gray-500">
          No delivered orders or expenses in this period. Deliver completed orders to record
          sales and COGS; add monthly costs under{" "}
          <Link href="/expenses" className="link-brand text-xs">
            Expenses
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function CostRow({
  label,
  description,
  amount,
  href,
  bold,
}: {
  label: string;
  description: string;
  amount: number;
  href?: string;
  bold?: boolean;
}) {
  const value = (
    <span className={bold ? "text-base font-bold" : "font-semibold"}>
      {formatCurrency(amount)}
    </span>
  );

  return (
    <div className="flex justify-between gap-4">
      <div>
        <p className={`text-servora-charcoal ${bold ? "font-semibold" : "font-medium"}`}>
          {label}
        </p>
        <p className="text-xs text-gray-500">{description}</p>
        {href && (
          <Link href={href} className="text-xs link-brand">
            Manage →
          </Link>
        )}
      </div>
      {value}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  highlight?: "danger" | "success";
}) {
  return (
    <div className="metric-card">
      <p className="metric-card-label">{label}</p>
      <p
        className={`metric-card-value ${
          highlight === "danger"
            ? "text-danger"
            : highlight === "success"
              ? "text-success"
              : ""
        }`}
      >
        {value}
      </p>
      {sub && <div className="mt-1 text-xs text-charcoal-muted">{sub}</div>}
    </div>
  );
}
