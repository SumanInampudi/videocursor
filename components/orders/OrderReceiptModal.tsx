"use client";

import { useEffect, useState, useTransition } from "react";
import { getOrderReceipt, type OrderReceiptData } from "@/app/actions/receipt";
import { Button } from "@/components/ui/Button";
import { formatTimeIST } from "@/lib/format";
import { formatCurrency } from "@/lib/units";

type OrderReceiptModalProps = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function OrderReceiptModal({
  orderId,
  open,
  onClose,
  title = "Receipt",
}: OrderReceiptModalProps) {
  const [receipt, setReceipt] = useState<OrderReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !orderId) {
      setReceipt(null);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await getOrderReceipt(orderId);
      if ("error" in result) {
        setError(result.error);
        setReceipt(null);
      } else {
        setReceipt(result.receipt);
        setError(null);
      }
    });
  }, [open, orderId]);

  if (!open) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 print:relative print:inset-auto print:bg-white print:p-0">
      <div
        className="flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl print:max-h-none print:shadow-none print:rounded-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 no-print safe-area-top">
          <h2 id="receipt-title" className="text-lg font-bold text-servora-charcoal">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 print:overflow-visible" id="order-receipt-print">
          {pending && !receipt && (
            <p className="text-center text-sm text-gray-500">Loading receipt…</p>
          )}
          {error && (
            <p className="text-center text-sm text-servora-red">{error}</p>
          )}
          {receipt && <ReceiptBody receipt={receipt} />}
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-4 no-print safe-area-bottom">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Done
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!receipt}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceiptBody({ receipt }: { receipt: OrderReceiptData }) {
  const when = receipt.paidAt ?? receipt.createdAt;

  return (
    <div className="receipt-body mx-auto max-w-sm font-mono text-[13px] leading-relaxed text-gray-900">
      <div className="text-center">
        <p className="text-base font-bold uppercase tracking-wide">
          {receipt.taxLegalName || receipt.businessName}
        </p>
        {receipt.taxLegalName && receipt.businessName !== receipt.taxLegalName && (
          <p className="text-xs text-gray-600">{receipt.businessName}</p>
        )}
        {receipt.taxGstin && (
          <p className="text-xs">GSTIN: {receipt.taxGstin}</p>
        )}
        <p className="mt-2 text-xs text-gray-600">Tax Invoice / Receipt</p>
      </div>

      <hr className="my-3 border-dashed border-gray-400" />

      <div className="space-y-0.5 text-xs">
        <p>
          <span className="text-gray-500">Order</span> {receipt.orderNumber}
        </p>
        <p>
          <span className="text-gray-500">Date</span> {formatTimeIST(when)}
        </p>
        <p>
          <span className="text-gray-500">Channel</span> {receipt.channelLabel}
          {receipt.tableLabel ? ` · ${receipt.tableLabel}` : ""}
        </p>
        {receipt.customerName && (
          <p>
            <span className="text-gray-500">Guest</span> {receipt.customerName}
          </p>
        )}
        {receipt.paymentMethodLabel && (
          <p>
            <span className="text-gray-500">Paid</span> {receipt.paymentMethodLabel}
          </p>
        )}
      </div>

      <hr className="my-3 border-dashed border-gray-400" />

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300 text-left text-gray-500">
            <th className="pb-1">Item</th>
            <th className="pb-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((line, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1 pr-2">
                {line.quantity}× {line.name}
              </td>
              <td className="py-1 text-right tabular-nums">
                {formatCurrency(line.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-3 border-dashed border-gray-400" />

      <div className="space-y-0.5 text-xs">
        <Row label="Subtotal" value={formatCurrency(receipt.subtotal)} />
        {receipt.discountTotal > 0 && (
          <Row label="Discount" value={`−${formatCurrency(receipt.discountTotal)}`} />
        )}
        {receipt.gstRatePercent > 0 && (
          <>
            <Row
              label={`Taxable value${receipt.pricesIncludeTax ? " (incl.)" : ""}`}
              value={formatCurrency(receipt.taxableAmount)}
            />
            {receipt.cgstAmount > 0 && (
              <Row
                label={`CGST ${receipt.cgstPercent}%`}
                value={formatCurrency(receipt.cgstAmount)}
              />
            )}
            {receipt.sgstAmount > 0 && (
              <Row
                label={`SGST ${receipt.sgstPercent}%`}
                value={formatCurrency(receipt.sgstAmount)}
              />
            )}
            {receipt.igstAmount > 0 && (
              <Row
                label={`IGST ${receipt.igstPercent}%`}
                value={formatCurrency(receipt.igstAmount)}
              />
            )}
          </>
        )}
        {receipt.tipAmount > 0 && (
          <Row label="Tip" value={formatCurrency(receipt.tipAmount)} />
        )}
        <div className="flex justify-between border-t border-gray-800 pt-2 text-sm font-bold">
          <span>Total</span>
          <span>{formatCurrency(receipt.grandTotal)}</span>
        </div>
      </div>

      {receipt.notes && (
        <>
          <hr className="my-3 border-dashed border-gray-400" />
          <p className="text-xs text-gray-600">Note: {receipt.notes}</p>
        </>
      )}

      <p className="mt-6 text-center text-[10px] text-gray-500">
        Thank you · Servora
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
