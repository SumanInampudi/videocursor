"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RecipeThumbnail } from "@/components/recipes/RecipeThumbnail";
import type { OrderCartLine } from "@/lib/order-cart";
import {
  ORDER_PAYMENT_METHODS,
  PAYMENT_METHOD_HINTS,
  PAYMENT_METHOD_LABELS,
  type PosPaymentMethod,
} from "@/lib/pos-payment";
import { OrderPrepEstimate } from "@/components/orders/OrderPrepEstimate";
import { orderChannelLabel } from "@/lib/order-channel";
import type { PricedRecipe } from "@/lib/order-cart";
import { formatFieldErrors } from "@/lib/format-field-errors";
import { formatCurrency } from "@/lib/units";
import type { OrderChannel } from "@prisma/client";

type CheckoutFields = {
  customerId: string;
  customerName: string;
  discountCode: string;
  notes: string;
  channel: OrderChannel;
  diningTableId: string;
  externalRef: string;
  tableLabel?: string;
};

type PosCheckoutModalProps = {
  open: boolean;
  cart: OrderCartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  isPending: boolean;
  errors: Record<string, string[]>;
  onClose: () => void;
  onConfirm: (paymentMethod: PosPaymentMethod, fields: CheckoutFields) => void;
  onConfirmSend?: (fields: CheckoutFields) => void;
  sendToKitchen?: boolean;
  addingToOrder?: string | null;
  fields: CheckoutFields;
  recipes: PricedRecipe[];
};

export function PosCheckoutModal({
  open,
  cart,
  subtotal,
  discountAmount,
  total,
  isPending,
  errors,
  onClose,
  onConfirm,
  onConfirmSend,
  sendToKitchen = false,
  addingToOrder = null,
  fields,
  recipes,
}: PosCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod | null>(null);

  useEffect(() => {
    if (open) setPaymentMethod(null);
  }, [open]);

  if (!open) return null;

  const checkoutAlert = formatFieldErrors(errors);
  const hasCheckoutErrors = Object.keys(errors).some(
    (k) => (errors[k]?.length ?? 0) > 0
  );

  function handleConfirm() {
    if (sendToKitchen) {
      onConfirmSend?.(fields);
      return;
    }
    if (!paymentMethod) return;
    onConfirm(paymentMethod, fields);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-checkout-title"
      >
        <div className="border-b border-gray-100 px-4 py-4 safe-area-top">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="pos-checkout-title" className="text-xl font-bold text-servora-charcoal">
                {sendToKitchen ? "Send to kitchen" : "Checkout"}
              </h2>
              <p className="text-sm text-gray-500">
                {sendToKitchen
                  ? addingToOrder
                    ? `Add items to ${addingToOrder} · pay when guests leave`
                    : "Open table bill · payment at close"
                  : "Select payment, then confirm to create the order"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="touch-target rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>

        <ul className="max-h-40 space-y-2 overflow-y-auto border-b border-gray-100 px-4 py-3">
          {cart.map((line) => (
            <li key={line.recipeId} className="flex items-center gap-2 text-sm">
              <RecipeThumbnail name={line.name} imageUrl={line.imageUrl} size="xs" />
              <span className="flex-1 truncate">{line.quantity}× {line.name}</span>
              <span className="font-medium">{formatCurrency(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-b border-gray-100 px-4 py-2">
          <OrderPrepEstimate
            lines={cart.map((l) => ({ recipeId: l.recipeId, quantity: l.quantity }))}
            recipes={recipes}
          />
          <p className="text-sm font-medium text-servora-charcoal">
            {orderChannelLabel(fields.channel)}
            {fields.channel === "DINE_IN" && fields.tableLabel
              ? ` · ${fields.tableLabel}`
              : ""}
            {fields.channel === "ONLINE" && fields.externalRef
              ? ` · ${fields.externalRef}`
              : ""}
          </p>
        </div>

        <div className="space-y-1 border-b border-gray-100 px-4 py-3 text-sm">
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
          <div className="flex justify-between text-xl font-bold text-servora-charcoal">
            <span>Amount due</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {!sendToKitchen && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-3 text-sm font-medium text-servora-charcoal">Payment method</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ORDER_PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    disabled={isPending}
                    onClick={() => setPaymentMethod(method)}
                    className={`touch-target rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? "border-servora-yellow bg-yellow-50 ring-2 ring-servora-yellow/30"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-base font-bold text-servora-charcoal">
                      {PAYMENT_METHOD_LABELS[method]}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {PAYMENT_METHOD_HINTS[method]}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.paymentMethod && (
              <p className="mt-2 text-sm text-servora-red">{errors.paymentMethod.join(", ")}</p>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 p-4 safe-area-bottom">
          {hasCheckoutErrors && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-servora-red" role="alert">
              {checkoutAlert}
            </p>
          )}
          <Button
            type="button"
            className="touch-target w-full py-4 text-base font-semibold"
            disabled={
              isPending ||
              cart.length === 0 ||
              (!sendToKitchen && !paymentMethod)
            }
            onClick={handleConfirm}
          >
            {isPending
              ? "Saving…"
              : sendToKitchen
                ? `Send to kitchen · ${formatCurrency(total)}`
                : paymentMethod
                  ? `Paid · ${PAYMENT_METHOD_LABELS[paymentMethod]} · ${formatCurrency(total)}`
                  : "Select payment method"}
          </Button>
          <p className="mt-2 text-center text-xs text-gray-400">
            {sendToKitchen
              ? "Bill stays open until you settle from Tables or the order page"
              : "Order is created only after you confirm payment"}
          </p>
        </div>
      </div>
    </div>
  );
}
