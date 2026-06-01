"use client";

import Link from "next/link";
import type { StockReceiveReceipt } from "@/lib/stock-receive-summary";
import { PAYMENT_STATUS_LABELS } from "@/lib/stock-receive-summary";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/units";
import { ReceiveSummaryLines } from "./ReceiveSummaryLines";

type ReceiveReceiptModalProps = {
  receipt: StockReceiveReceipt | null;
  open: boolean;
  onClose: () => void;
};

export function ReceiveReceiptModal({ receipt, open, onClose }: ReceiveReceiptModalProps) {
  if (!open || !receipt) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 print:relative print:inset-auto print:bg-white print:p-0">
      <div
        className="flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl print:max-h-none print:shadow-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-receipt-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 no-print safe-area-top">
          <h2 id="receive-receipt-title" className="text-lg font-bold text-servora-charcoal">
            Stock receive summary
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 print:overflow-visible" id="stock-receive-receipt-print">
          <p className="mb-3 text-xs text-gray-500">
            Posted {new Date(receipt.postedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            {" · "}
            Batch {receipt.receiveBatchId.slice(0, 8)}
          </p>

          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Purchase date</dt>
              <dd className="font-medium">{receipt.purchaseDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Payment</dt>
              <dd className="font-medium">
                {PAYMENT_STATUS_LABELS[receipt.paymentStatus]}
              </dd>
            </div>
            {receipt.supplierName && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Supplier</dt>
                <dd className="font-medium">{receipt.supplierName}</dd>
              </div>
            )}
            {receipt.invoiceRef && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Invoice / ref</dt>
                <dd className="font-medium">{receipt.invoiceRef}</dd>
              </div>
            )}
          </dl>

          <ReceiveSummaryLines lines={receipt.lines} />

          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Grand total</span>
              <span className="font-bold">{formatCurrency(receipt.grandTotal)}</span>
            </div>
            {receipt.amountPaid > 0 && (
              <p className="mt-1 text-emerald-800">
                {formatCurrency(receipt.amountPaid)} recorded in Expenses (Supplies)
              </p>
            )}
            {receipt.creditOwed > 0.0001 && (
              <p className="mt-1 text-amber-800">
                {formatCurrency(receipt.creditOwed)} on supplier credit — see Payables
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 p-4 no-print safe-area-bottom">
          <Button type="button" variant="secondary" onClick={handlePrint}>
            Print
          </Button>
          <Link href="/inventory/receive/history" className="flex-1">
            <Button type="button" variant="secondary" className="w-full">
              Receive history
            </Button>
          </Link>
          <Button type="button" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
