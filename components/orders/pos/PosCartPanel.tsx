"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStayOnPosAfterCheckout,
  setStayOnPosAfterCheckout,
} from "@/lib/pos-preferences";
import { ManagerPromotionsPanel } from "@/components/orders/ManagerPromotionsPanel";
import { OrderPromotionsPanel } from "@/components/orders/OrderPromotionsPanel";
import { serializeManagerAdjustmentsForForm } from "@/lib/promotion-engine/manager";
import type { ManagerAdjustmentsInput } from "@/lib/promotion-engine/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import {
  PosChannelTablePicker,
  type DiningTableOption,
} from "@/components/orders/pos/PosChannelTablePicker";
import { OrderPrepEstimate } from "@/components/orders/OrderPrepEstimate";
import type { OrderCartLine, PricedProduct } from "@/lib/order-cart";
import { isPayAtClose } from "@/lib/venue-settings";
import type { VenuePosSettings } from "@/lib/venue-settings";
import { formatCurrency } from "@/lib/units";
import type { OrderChannel } from "@prisma/client";
import type { PosProductAvailability } from "@/lib/pos-stock-status";

type CustomerOption = { id: string; name: string };

type PosCartPanelProps = {
  cart: OrderCartLine[];
  /** Paid lines plus auto-included companions for display. */
  displayLines?: OrderCartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customers: CustomerOption[];
  isPending: boolean;
  errors: Record<string, string[]>;
  onUpdateQty: (productId: string, qty: number) => void;
  onClear: () => void;
  canManageDiscounts?: boolean;
  onDiscountApplied: (payload: {
    code: string;
    promoDiscount: number;
    managerDiscount: number;
    discountAmount: number;
    appliedPromotions: { name: string; code?: string | null; discountAmount: number }[];
  } | null) => void;
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
    managerDiscountMode?: string;
    managerDiscountValue?: string;
    managerDiscountReason?: string;
    compLinesJson?: string;
  }) => void;
  mobileCollapsed?: boolean;
  resetKey?: number;
  products: PricedProduct[];
  availability?: Record<string, PosProductAvailability>;
  activeOrderNumber?: string | null;
  onSettleTab?: () => void;
};

export function PosCartPanel({
  cart,
  displayLines,
  subtotal,
  discountAmount,
  total,
  customers,
  isPending,
  errors,
  onUpdateQty,
  onClear,
  onDiscountApplied,
  canManageDiscounts = false,
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
  products,
  availability = {},
  activeOrderNumber = null,
  onSettleTab,
}: PosCartPanelProps) {
  const lines = displayLines ?? cart;
  const cartLinesForPromo = useMemo(
    () => cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    [cart]
  );
  const sendToKitchen =
    channel === "DINE_IN" && isPayAtClose(venue, "DINE_IN");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [managerDiscount, setManagerDiscount] = useState(0);
  const [appliedPromotions, setAppliedPromotions] = useState<
    { name: string; code?: string | null; discountAmount: number }[]
  >([]);
  const [managerAdjustments, setManagerAdjustments] = useState<ManagerAdjustmentsInput>({});
  const [notes, setNotes] = useState("");
  const [stayOnPos, setStayOnPos] = useState(true);

  useEffect(() => {
    setStayOnPos(getStayOnPosAfterCheckout());
  }, []);

  useEffect(() => {
    setCustomerId("");
    setCustomerName("");
    setDiscountCode("");
    setPromoDiscount(0);
    setManagerDiscount(0);
    setAppliedPromotions([]);
    setManagerAdjustments({});
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
      ...serializeManagerAdjustmentsForForm(managerAdjustments),
    });
  }

  const panel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="font-semibold text-servora-charcoal">Current order</h2>
          {activeOrderNumber && (
            <p className="text-xs text-amber-800">Adding to {activeOrderNumber}</p>
          )}
        </div>
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
          {lines.length === 0 ? (
            <li className="py-8 text-center text-sm text-gray-400">
              Tap menu items to add · then Checkout
            </li>
          ) : (
            lines.map((line) => {
              const isIncluded = line.isIncluded === true;
              const avail = isIncluded ? undefined : availability[line.productId];
              const overStock =
                !isIncluded &&
                avail != null &&
                avail.maxServings > 0 &&
                line.quantity > avail.maxServings;
              return (
              <li
                key={`${line.productId}-${isIncluded ? "inc" : "paid"}`}
                className={`flex items-center gap-2 rounded-lg p-2 ${
                  isIncluded
                    ? "bg-emerald-50/80 ring-1 ring-emerald-100"
                    : overStock
                      ? "bg-red-50 ring-1 ring-red-200"
                      : "bg-gray-50"
                }`}
              >
                <ProductThumbnail name={line.name} imageUrl={line.imageUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-gray-500">
                    {isIncluded ? "Included · free" : `${formatCurrency(line.unitPrice)} × ${line.quantity}`}
                    {isIncluded ? ` · × ${line.quantity}` : ""}
                  </p>
                  {overStock && (
                    <p className="text-xs text-red-700">
                      Exceeds stock — max {avail.maxServings}
                    </p>
                  )}
                  {avail?.status === "low" && !overStock && avail.label && (
                    <p className="text-xs text-amber-700">{avail.label}</p>
                  )}
                </div>
                {!isIncluded && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="touch-target flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-bold"
                      onClick={() => onUpdateQty(line.productId, line.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      className="touch-target flex h-10 w-10 items-center justify-center rounded-lg bg-servora-yellow text-lg font-bold text-white"
                      onClick={() => onUpdateQty(line.productId, line.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                )}
              </li>
            );
            })
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
          <OrderPromotionsPanel
            subtotal={subtotal}
            channel={channel}
            customerId={customerId || undefined}
            cartLines={cartLinesForPromo}
            onApplied={(payload) => {
              const promoAmount = payload?.discountAmount ?? 0;
              setPromoDiscount(promoAmount);
              setDiscountCode(payload?.code ?? "");
              setAppliedPromotions(payload?.promotions ?? []);
              const combined = promoAmount + managerDiscount;
              onDiscountApplied(
                combined > 0
                  ? {
                      code: payload?.code ?? "",
                      promoDiscount: promoAmount,
                      managerDiscount,
                      discountAmount: combined,
                      appliedPromotions: payload?.promotions ?? [],
                    }
                  : null
              );
            }}
          />
          <ManagerPromotionsPanel
            canManageDiscounts={canManageDiscounts}
            cartLines={cart}
            promoDiscountTotal={promoDiscount}
            onAdjustmentsChange={(payload) => {
              if (!payload) {
                setManagerAdjustments({});
                setManagerDiscount(0);
                const combined = promoDiscount;
                onDiscountApplied(
                  combined > 0
                    ? {
                        code: discountCode,
                        promoDiscount,
                        managerDiscount: 0,
                        discountAmount: combined,
                        appliedPromotions,
                      }
                    : null
                );
                return;
              }
              setManagerAdjustments(payload.adjustments);
              setManagerDiscount(payload.managerDiscountTotal);
              const combined = promoDiscount + payload.managerDiscountTotal;
              onDiscountApplied(
                combined > 0
                  ? {
                      code: discountCode,
                      promoDiscount,
                      managerDiscount: payload.managerDiscountTotal,
                      discountAmount: combined,
                      appliedPromotions,
                    }
                  : null
              );
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
              lines={cart.map((l) => ({ productId: l.productId, quantity: l.quantity }))}
              products={products}
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

          {activeOrderNumber && onSettleTab && (
            <Button
              type="button"
              variant="secondary"
              className="touch-target mb-2 w-full"
              disabled={isPending}
              onClick={onSettleTab}
            >
              Settle table bill
            </Button>
          )}
          <Button
            type="button"
            className="touch-target w-full py-4 text-base font-semibold"
            disabled={isPending || cart.length === 0}
            onClick={submitCheckout}
          >
            {sendToKitchen ? "Send to kitchen" : "Checkout"} · {formatCurrency(total)}
          </Button>
          <p className="text-center text-xs text-gray-500">
            {sendToKitchen
              ? "Payment when guests leave · use Tables to settle"
              : "Next: choose Cash, Card, or PhonePe and confirm payment"}
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
              {sendToKitchen ? "Send" : "Checkout"}
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
