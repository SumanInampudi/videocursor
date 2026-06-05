"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCalendarDateString } from "@/lib/dates";
import type { ReceiveCartLine } from "@/lib/stock-receive-cart";
import { formatCurrency, formatQuantity } from "@/lib/units";

type SupplierOption = { id: string; name: string };

const PAYMENT_OPTIONS = [
  { value: "PAID", label: "Paid in full" },
  { value: "CREDIT", label: "On credit" },
  { value: "PARTIAL", label: "Partially paid" },
];

type ReceiveCartPanelProps = {
  cart: ReceiveCartLine[];
  total: number;
  suppliers: SupplierOption[];
  isPending: boolean;
  errors: Record<string, string[]>;
  onUpdateQty: (rawMaterialId: string, qty: number) => void;
  onUpdateUnitCost: (rawMaterialId: string, unitCost: number) => void;
  onClear: () => void;
  onPost: (fields: {
    supplierId: string;
    paymentStatus: string;
    amountPaid?: number;
    purchaseDate: string;
    dueDate?: string;
    notes: string;
    invoiceRef: string;
  }) => void;
  mobileCollapsed?: boolean;
};

export function ReceiveCartPanel({
  cart,
  total,
  suppliers,
  isPending,
  errors,
  onUpdateQty,
  onUpdateUnitCost,
  onClear,
  onPost,
  mobileCollapsed = false,
}: ReceiveCartPanelProps) {
  const [expanded, setExpanded] = useState(!mobileCollapsed);
  const [supplierId, setSupplierId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [amountPaid, setAmountPaid] = useState("");
  const [purchaseDate] = useState(() => formatCalendarDateString(new Date()));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");

  const linesError = errors.lines?.[0];

  function handlePost() {
    onPost({
      supplierId,
      paymentStatus,
      amountPaid:
        paymentStatus === "PARTIAL" ? parseFloat(amountPaid) || undefined : undefined,
      purchaseDate,
      dueDate: dueDate || undefined,
      notes,
      invoiceRef,
    });
  }

  const panel = (
    <div className="flex h-full min-h-0 flex-col bg-white md:border-l md:border-gray-200">
      <div className="border-b border-gray-100 px-3 py-3">
        <h2 className="text-lg font-bold text-servora-charcoal">Receive cart</h2>
        <p className="text-xs text-gray-500">Qty + unit cost per line · updates stock on hand</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <p className="text-sm text-gray-500">Tap raw materials to add them here.</p>
        ) : (
          cart.map((line) => (
            <div
              key={line.ingredientId}
              className="rounded-lg border border-gray-200 bg-gray-50 p-2"
            >
              <div className="font-medium text-sm text-servora-charcoal">{line.name}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">
                  Qty ({line.unit})
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={line.quantity}
                    onChange={(e) =>
                      onUpdateQty(line.ingredientId, parseFloat(e.target.value) || 0)
                    }
                    className="mt-0.5 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Cost / {line.unit}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) =>
                      onUpdateUnitCost(
                        line.ingredientId,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="mt-0.5 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                  />
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Line: {formatCurrency(line.quantity * line.unitCost)} ·{" "}
                {formatQuantity(line.quantity, line.unit)}
              </p>
            </div>
          ))
        )}

        {linesError && (
          <p className="text-sm text-red-600" role="alert">
            {linesError}
          </p>
        )}

        {cart.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            {suppliers.length > 0 && (
              <Select
                label="Supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                options={[
                  { value: "", label: "— Optional —" },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
                error={errors.supplierId?.[0]}
              />
            )}
            <Input
              label="Invoice / delivery ref"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="Bill #, GRN…"
            />
            <Select
              label="Payment"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={PAYMENT_OPTIONS}
              error={errors.paymentStatus?.[0]}
            />
            {paymentStatus === "PARTIAL" && (
              <Input
                label="Amount paid so far"
                type="number"
                step="0.01"
                min="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                error={errors.amountPaid?.[0]}
              />
            )}
            {(paymentStatus === "CREDIT" || paymentStatus === "PARTIAL") && (
              <Input
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                error={errors.dueDate?.[0]}
              />
            )}
            <Input
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              error={errors.notes?.[0]}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white p-3 safe-area-bottom">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {cart.length} line{cart.length === 1 ? "" : "s"}
          </span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isPending || cart.length === 0}
            onClick={onClear}
          >
            Clear
          </Button>
          <Button
            type="button"
            className="flex-[2]"
            disabled={isPending || cart.length === 0}
            onClick={handlePost}
          >
            {isPending ? "Posting…" : "Review & post"}
          </Button>
        </div>
      </div>
    </div>
  );

  if (mobileCollapsed) {
    return (
      <>
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-gray-200 bg-white p-3 shadow-lg safe-area-bottom md:hidden">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="touch-target min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-left"
          >
            <span className="block font-semibold text-servora-charcoal">
              {cart.length} item{cart.length === 1 ? "" : "s"} · {formatCurrency(total)}
            </span>
            <span className="text-xs text-gray-500">Tap to review</span>
          </button>
          {cart.length > 0 && (
            <Button
              type="button"
              className="touch-target shrink-0 px-4 py-3 text-sm font-semibold"
              disabled={isPending}
              onClick={handlePost}
            >
              Review
            </Button>
          )}
        </div>
        {expanded && (
          <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white md:hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-3 py-2 safe-area-top">
              <span className="font-semibold">Receive cart</span>
              <button
                type="button"
                className="touch-target rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setExpanded(false)}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{panel}</div>
          </div>
        )}
      </>
    );
  }

  return panel;
}
