"use client";

import { formatDateTimeIST } from "@/lib/format";
import {
  buildOrderStageTimeline,
  type OrderStageTimestamps,
} from "@/lib/order-stage-timing";

type OrderStageTimelineProps = {
  order: OrderStageTimestamps;
};

export function OrderStageTimeline({ order }: OrderStageTimelineProps) {
  const { rows, totalLabel, completedMs } = buildOrderStageTimeline(order);

  if (rows.length === 0) return null;

  const maxMs = Math.max(...rows.map((r) => r.durationMs ?? 0), 1);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-servora-charcoal">Time in each stage</h2>
        <p className="text-sm text-gray-600">
          {order.status === "DELIVERED" || order.status === "CANCELLED" ? (
            <>
              Total: <span className="font-semibold tabular-nums text-servora-charcoal">{totalLabel}</span>
            </>
          ) : (
            <>
              Elapsed so far:{" "}
              <span className="font-semibold tabular-nums text-servora-charcoal">{totalLabel}</span>
            </>
          )}
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Use this to tune prep estimates and spot bottlenecks (longest stage highlighted).
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const pct =
            row.durationMs != null ? Math.max(4, (row.durationMs / maxMs) * 100) : 0;
          return (
            <li key={row.key}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-servora-charcoal">
                  {row.label}
                  {row.isCurrent && (
                    <span className="ml-2 text-xs font-normal text-servora-yellow">(now)</span>
                  )}
                  {row.isBottleneck && (
                    <span className="ml-2 text-xs font-semibold text-servora-red">Bottleneck</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{row.durationLabel}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    row.isBottleneck
                      ? "bg-servora-red"
                      : row.isCurrent
                        ? "bg-servora-yellow"
                        : "bg-gray-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {(row.startedAt || row.endedAt) && (
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {row.startedAt && formatDateTimeIST(row.startedAt)}
                  {row.endedAt ? ` → ${formatDateTimeIST(row.endedAt)}` : row.isCurrent ? " → …" : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {completedMs != null && order.status === "DELIVERED" && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Order completed in {totalLabel} from received to delivered.
        </p>
      )}
    </section>
  );
}
