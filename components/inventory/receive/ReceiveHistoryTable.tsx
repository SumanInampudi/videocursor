"use client";

import { useMemo, useState } from "react";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { smartMatches } from "@/lib/smart-search";
import type { StockReceiveBatchSummary } from "@/lib/stock-receive-summary";
import { PAYMENT_STATUS_LABELS } from "@/lib/stock-receive-summary";
import { formatCurrency } from "@/lib/units";
import { ReceiveSummaryLines } from "./ReceiveSummaryLines";

type ReceiveHistoryTableProps = {
  batches: StockReceiveBatchSummary[];
};

export function ReceiveHistoryTable({ batches }: ReceiveHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredBatches = useMemo(() => {
    if (!query.trim()) return batches;
    return batches.filter((batch) =>
      smartMatches(
        [
          batch.purchaseDate,
          batch.supplierName,
          batch.invoiceRef,
          batch.paymentStatus,
          batch.kind,
          ...batch.lines.map((line) => line.name),
        ],
        query
      )
    );
  }, [batches, query]);

  if (batches.length === 0) {
    return (
      <div className="empty-state text-sm text-gray-500">
        No stock receives in this date range.
      </div>
    );
  }

  if (filteredBatches.length === 0) {
    return (
      <div className="space-y-2">
        <SmartSearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search supplier, invoice ref, raw material, payment..."
          className="max-w-md"
        />
        <p className="text-xs text-gray-500">0 results</p>
        <div className="empty-state text-sm text-gray-500">
          No matching receive records found for this search.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SmartSearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search supplier, invoice ref, raw material, payment..."
        className="max-w-md"
      />
      <p className="text-xs text-gray-500">
        {filteredBatches.length} result{filteredBatches.length === 1 ? "" : "s"}
      </p>
      {filteredBatches.map((batch) => {
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
