import { formatCurrency } from "@/lib/units";

type SummarySlice = {
  revenue: number;
  grossProfit: number;
  netProfit: number;
};

export function ProfitComparison({
  current,
  previous,
}: {
  current: SummarySlice;
  previous: SummarySlice;
}) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <CompareCard label="Revenue" current={current.revenue} previous={previous.revenue} />
      <CompareCard
        label="Gross profit"
        current={current.grossProfit}
        previous={previous.grossProfit}
      />
      <CompareCard label="Net profit" current={current.netProfit} previous={previous.netProfit} />
    </div>
  );
}

function CompareCard({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const delta = current - previous;
  const pct = previous !== 0 ? ((delta / previous) * 100).toFixed(1) : null;

  return (
    <div className="card-padded shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-servora-charcoal">{formatCurrency(current)}</p>
      <p className="mt-1 text-xs text-gray-500">
        Prior period: {formatCurrency(previous)}
        {pct != null && (
          <span className={delta >= 0 ? " text-green-700" : " text-servora-red"}>
            {" "}
            ({delta >= 0 ? "+" : ""}
            {pct}%)
          </span>
        )}
      </p>
    </div>
  );
}
