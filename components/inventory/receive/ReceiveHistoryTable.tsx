"use client";

import { useState } from "react";
import type { StockReceiveBatchSummary } from "@/lib/stock-receive-summary";
import { PAYMENT_STATUS_LABELS } from "@/lib/stock-receive-summary";
import { formatCurrency } from "@/lib/units";
import { ReceiveSummaryLines } from "./ReceiveSummaryLines";

type ReceiveHistoryTableProps = {
  batches: StockReceiveBatchSummary[];
};

export function ReceiveHistoryTable({ batches }: ReceiveHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (batches.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No stock receives in this date range.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {batches.map((batch) => {
        const expanded = expandedId === batch.receiveBatchId;
        return (
          <article
            key={batch.receiveBatchId}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <button
              type="button"
              className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
              onClick={() =>
                setExpandedId(expanded ? null : batch.receiveBatchId)
              }
              aria-expanded={expanded}
            >
              <div className="min-w-0">
                <p className="font-semibold text-servora-charcoal">
                  {batch.purchaseDate}
                  {batch.supplierName ? ` · ${batch.supplierName}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  <span
                    className={
                      batch.kind === "manual"
                        ? "font-medium text-violet-700"
                        : "font-medium text-sky-700"
                    }
                  >
                    {batch.kind === "manual" ? "Manual edit" : "Stock receive"}
                  </span>
                  {" · "}
                  {batch.lineCount} line{batch.lineCount === 1 ? "" : "s"}
                  {batch.kind === "receive" && (
                    <>
                      {" · "}
                      {PAYMENT_STATUS_LABELS[batch.paymentStatus]}
                    </>
                  )}
                  {batch.invoiceRef ? ` · Ref ${batch.invoiceRef}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-servora-charcoal">
                  {formatCurrency(batch.grandTotal)}
                </p>
                <p className="text-xs text-gray-500">
                  {expanded ? "Hide details" : "View details"}
                </p>
              </div>
            </button>
            {expanded && (
              <div className="border-t border-gray-100 px-4 py-3">
                <ReceiveSummaryLines lines={batch.lines} />
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                  <span>Paid: {formatCurrency(batch.amountPaid)}</span>
                  {batch.creditOwed > 0.0001 && (
                    <span>Credit: {formatCurrency(batch.creditOwed)}</span>
                  )}
                  <span>
                    Posted{" "}
                    {new Date(batch.postedAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
