"use client";

import type { ReceiveCartLine } from "@/lib/stock-receive-cart";
import { PAYMENT_STATUS_LABELS } from "@/lib/stock-receive-summary";
import type { PurchasePaymentStatus } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/units";
import { ReceiveSummaryLines } from "./ReceiveSummaryLines";

export type ReceivePostFields = {
  supplierId: string;
  paymentStatus: string;
  amountPaid?: number;
  purchaseDate: string;
  dueDate?: string;
  notes: string;
  invoiceRef: string;
};

type ReceiveReviewModalProps = {
  open: boolean;
  cart: ReceiveCartLine[];
  fields: ReceivePostFields;
  supplierName: string | null;
  total: number;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ReceiveReviewModal({
  open,
  cart,
  fields,
  supplierName,
  total,
  isPending,
  onClose,
  onConfirm,
}: ReceiveReviewModalProps) {
  if (!open) return null;

  const lines = cart.map((l) => ({
    name: l.name,
    quantity: l.quantity,
    unit: l.unit,
    unitCost: l.unitCost,
    lineTotal: l.quantity * l.unitCost,
  }));

  const status = fields.paymentStatus as PurchasePaymentStatus;
  const amountPaid =
    status === "PAID"
      ? total
      : status === "CREDIT"
        ? 0
        : fields.amountPaid ?? 0;
  const creditOwed = Math.max(0, total - amountPaid);

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-review-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 safe-area-top">
          <h2 id="receive-review-title" className="text-lg font-bold text-servora-charcoal">
            Review before posting
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            Back
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Purchase date</dt>
              <dd className="font-medium">{fields.purchaseDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Payment</dt>
              <dd className="font-medium">{PAYMENT_STATUS_LABELS[status]}</dd>
            </div>
            {supplierName && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Supplier</dt>
                <dd className="font-medium">{supplierName}</dd>
              </div>
            )}
            {fields.invoiceRef && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Invoice / ref</dt>
                <dd className="font-medium">{fields.invoiceRef}</dd>
              </div>
            )}
            {fields.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Notes</dt>
                <dd className="text-gray-700">{fields.notes}</dd>
              </div>
            )}
          </dl>

          <ReceiveSummaryLines lines={lines} />

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Grand total</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
            {status !== "CREDIT" && (
              <div className="mt-1 flex justify-between">
                <span className="text-gray-600">Cash / paid (→ expenses)</span>
                <span className="font-medium">{formatCurrency(amountPaid)}</span>
              </div>
            )}
            {creditOwed > 0.0001 && (
              <div className="mt-1 flex justify-between text-amber-800">
                <span>On supplier credit</span>
                <span className="font-medium">{formatCurrency(creditOwed)}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Posting updates on-hand stock and purchase records. Paid amounts are recorded under
            Expenses (Supplies).
          </p>
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-4 safe-area-bottom">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isPending}
            onClick={onClose}
          >
            Edit cart
          </Button>
          <Button type="button" className="flex-[2]" disabled={isPending} onClick={onConfirm}>
            {isPending ? "Posting…" : "Confirm & post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
