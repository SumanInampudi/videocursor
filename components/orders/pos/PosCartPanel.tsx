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
import {
  PosChannelTablePicker,
  type DiningTableOption,
} from "@/components/orders/pos/PosChannelTablePicker";
import { OrderPrepEstimate } from "@/components/orders/OrderPrepEstimate";
import type { OrderCartLine, PricedRecipe } from "@/lib/order-cart";
import type { VenuePosSettings } from "@/lib/venue-settings";
import { formatCurrency } from "@/lib/units";
import type { OrderChannel } from "@prisma/client";

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
  venue: VenuePosSettings;
  tables: DiningTableOption[];
  channel: OrderChannel;
  diningTableId: string;
  externalRef: string;
  onChannelChange: (channel: OrderChannel) => void;
  onTableChange: (tableId: string) => void;
  onExternalRefChange: (ref: string) => void;
  onCheckout: (fields: {
    customerId: string;
    customerName: string;
    discountCode: string;
    notes: string;
    channel: OrderChannel;
    diningTableId: string;
    externalRef: string;
  }) => void;
  mobileCollapsed?: boolean;
  resetKey?: number;
  recipes: PricedRecipe[];
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
  venue,
  tables,
  channel,
  diningTableId,
  externalRef,
  onChannelChange,
  onTableChange,
  onExternalRefChange,
  onCheckout,
  mobileCollapsed = false,
  resetKey = 0,
  recipes,
}: PosCartPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
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
    if (cart.length > 0 && mobileCollapsed) {
      setSheetOpen(true);
    }
  }, [cart.length, mobileCollapsed]);

  function toggleStay(checked: boolean) {
    setStayOnPos(checked);
    setStayOnPosAfterCheckout(checked);
  }

  function submitCheckout() {
    onCheckout({
      customerId,
      customerName,
      discountCode,
      notes,
      channel,
      diningTableId,
      externalRef,
    });
  }

  const panel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ul className="space-y-2 p-3 md:p-4">
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

        <div className="space-y-3 border-t border-gray-100 p-3 pb-8 md:p-4 md:pb-8">
          <PosChannelTablePicker
            venue={venue}
            tables={tables}
            channel={channel}
            diningTableId={diningTableId}
            externalRef={externalRef}
            onChannelChange={onChannelChange}
            onTableChange={onTableChange}
            onExternalRefChange={onExternalRefChange}
          />
          {(errors.channel || errors.diningTableId) && (
            <p className="text-sm text-servora-red">
              {[...(errors.channel ?? []), ...(errors.diningTableId ?? [])].join(" ")}
            </p>
          )}
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

          {cart.length > 0 && (
            <OrderPrepEstimate
              lines={cart.map((l) => ({ recipeId: l.recipeId, quantity: l.quantity }))}
              recipes={recipes}
            />
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

  if (mobileCollapsed) {
    return (
      <>
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-gray-200 bg-white p-3 shadow-lg safe-area-bottom">
          <button
            type="button"
            className="touch-target min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-left"
            onClick={() => setSheetOpen(true)}
          >
            <span className="block font-semibold text-servora-charcoal">
              Cart ({cart.length}) · {formatCurrency(total)}
            </span>
            <span className="text-xs text-gray-500">Tap to review order</span>
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
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-3 py-2 safe-area-top">
              <span className="font-semibold text-servora-charcoal">Current order</span>
              <button
                type="button"
                className="touch-target rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setSheetOpen(false)}
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
