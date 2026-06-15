"use client";

import { formatCurrency } from "@/lib/units";

type Row = { date: string; revenue: number; netProfit: number };

export function ProfitChart({ rows }: { rows: Row[] }) {
  const withRevenue = rows.filter((r) => r.revenue > 0 || r.netProfit !== 0);
  if (withRevenue.length === 0) {
    return (
      <p className="text-sm text-gray-500">No data to chart for this period.</p>
    );
  }

  const max = Math.max(...withRevenue.map((r) => Math.max(r.revenue, Math.abs(r.netProfit))), 1);

  return (
    <div className="card-padded">
      <p className="mb-3 text-xs text-gray-500">Revenue (bars) vs net profit (line) by day</p>
      <div className="flex h-40 items-end gap-0.5 overflow-x-auto">
        {withRevenue.map((row) => {
          const revH = (row.revenue / max) * 100;
          const netH = (Math.max(0, row.netProfit) / max) * 100;
          return (
            <div
              key={row.date}
              className="flex min-w-[8px] flex-1 flex-col items-center justify-end gap-0.5"
              title={`${row.date}: ${formatCurrency(row.revenue)} rev, ${formatCurrency(row.netProfit)} net`}
            >
              <div
                className="w-full rounded-t bg-servora-yellow/80"
                style={{ height: `${Math.max(revH, 2)}%` }}
              />
              <div
                className="w-full rounded-t bg-green-600/70"
                style={{ height: `${Math.max(netH, row.netProfit > 0 ? 2 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
