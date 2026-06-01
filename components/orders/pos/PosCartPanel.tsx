"use client";

import { useEffect, useState } from "react";
import {
  getStayOnPosAfterCheckout,
  setStayOnPosAfterCheckout,
} from "@/lib/pos-preferences";
import { OrderDiscountSection } from "@/components/orders/OrderDiscountSection";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { RecipeThumbnail } from "@/components/recipes/RecipeThumbnail";
import type { OrderCartLine } from "@/lib/order-cart";
import { formatCurrency } from "@/lib/units";

type CustomerOption = { id: string; name: string };

type PosCartPanelProps = {
  cart: OrderCartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customers: CustomerOption[];
  isPending: boolean;
  errors: Record<string, string[]>;
  onUpdateQty: (recipeId: string, qty: number) => void;
  onClear: () => void;
  onDiscountApplied: (payload: { code: string; discountAmount: number } | null) => void;
  onCheckout: (fields: {
    customerId: string;
    customerName: string;
    discountCode: string;
    notes: string;
  }) => void;
  mobileCollapsed?: boolean;
  resetKey?: number;
};

export function PosCartPanel({
  cart,
  subtotal,
  discountAmount,
  total,
  customers,
  isPending,
  errors,
  onUpdateQty,
  onClear,
  onDiscountApplied,
  onCheckout,
  mobileCollapsed = false,
  resetKey = 0,
}: PosCartPanelProps) {
  const [expanded, setExpanded] = useState(!mobileCollapsed);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [notes, setNotes] = useState("");
  const [stayOnPos, setStayOnPos] = useState(true);

  useEffect(() => {
    setStayOnPos(getStayOnPosAfterCheckout());
  }, []);

  useEffect(() => {
    setCustomerId("");
    setCustomerName("");
    setDiscountCode("");
    setNotes("");
  }, [resetKey]);

  useEffect(() => {
    if (mobileCollapsed && cart.length > 0) {
      setExpanded(true);
    }
  }, [cart.length, mobileCollapsed]);

  function toggleStay(checked: boolean) {
    setStayOnPos(checked);
    setStayOnPosAfterCheckout(checked);
  }

  function submitCheckout() {
    onCheckout({ customerId, customerName, discountCode, notes });
  }

  const bodyClass = mobileCollapsed
    ? expanded
      ? "flex min-h-0 flex-1 flex-col"
      : "hidden min-h-0 flex-1 flex-col md:flex"
    : "flex min-h-0 flex-1 flex-col";

  return (
    <div
      className={`flex flex-col border-gray-200 bg-white ${
        mobileCollapsed
          ? "fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] rounded-t-2xl border-t shadow-2xl md:static md:z-auto md:max-h-none md:rounded-none md:border-l md:shadow-none"
          : "h-full border-l"
      }`}
    >
      {mobileCollapsed && (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2 md:hidden">
          <button
            type="button"
            className="touch-target min-w-0 flex-1 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="block font-semibold text-servora-charcoal">
              Cart ({cart.length}) · {formatCurrency(total)}
            </span>
            <span className="text-xs text-gray-500">
              {expanded ? "Hide cart ▼" : "Show cart ▲"}
            </span>
          </button>
          {cart.length > 0 && (
            <Button
              type="button"
              className="touch-target shrink-0 px-4 py-3 text-sm font-semibold"
              disabled={isPending}
              onClick={submitCheckout}
            >
              Checkout
            </Button>
          )}
        </div>
      )}

      <div className={bodyClass}>
        <div className="hidden items-center justify-between border-b border-gray-100 px-4 py-3 md:flex">
          <h2 className="font-semibold text-servora-charcoal">Current order</h2>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-servora-red"
            >
              Clear
            </button>
          )}
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-3 md:p-4">
          {cart.length === 0 ? (
            <li className="py-8 text-center text-sm text-gray-400">
              Tap menu items to add · then Checkout
            </li>
          ) : (
            cart.map((line) => (
              <li
                key={line.recipeId}
                className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
              >
                <RecipeThumbnail name={line.name} imageUrl={line.imageUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(line.unitPrice)} × {line.quantity}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="touch-target flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-bold"
                    onClick={() => onUpdateQty(line.recipeId, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                  <button
                    type="button"
                    className="touch-target flex h-10 w-10 items-center justify-center rounded-lg bg-servora-yellow text-lg font-bold text-white"
                    onClick={() => onUpdateQty(line.recipeId, line.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-3 border-t border-gray-100 p-3 md:p-4">
          <Select
            name="posCustomerId"
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: "", label: "Walk-in" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <input
            type="text"
            placeholder="Name on ticket (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <OrderDiscountSection
            subtotal={subtotal}
            onApplied={(payload) => {
              onDiscountApplied(payload);
              setDiscountCode(payload?.code ?? "");
            }}
          />
          <textarea
            placeholder="Order notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />

          <div className="space-y-1 text-sm">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {errors.lines && (
            <p className="text-sm text-servora-red">{errors.lines.join(", ")}</p>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={stayOnPos}
              onChange={(e) => toggleStay(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Stay on register after checkout
          </label>

          <Button
            type="button"
            className="touch-target w-full py-4 text-base font-semibold"
            disabled={isPending || cart.length === 0}
            onClick={submitCheckout}
          >
            Checkout · {formatCurrency(total)}
          </Button>
          <p className="text-center text-xs text-gray-500">
            Next: choose Cash, Card, or PhonePe and confirm payment
          </p>
        </div>
      </div>
    </div>
  );
}
