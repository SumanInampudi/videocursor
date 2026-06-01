"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleOrderPayment } from "@/app/actions/table-service";
import { OrderDiscountSection } from "@/components/orders/OrderDiscountSection";
import { OrderTotalsBreakdown } from "@/components/orders/OrderTotalsBreakdown";
import { TipSelector } from "@/components/orders/TipSelector";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatFieldErrors } from "@/lib/format-field-errors";
import { computeOrderTaxAmounts } from "@/lib/order-tax";
import type { TaxSettings } from "@/lib/tax-settings";
import {
  ORDER_PAYMENT_METHODS,
  PAYMENT_METHOD_HINTS,
  PAYMENT_METHOD_LABELS,
  type PosPaymentMethod,
} from "@/lib/pos-payment";
import { formatCurrency } from "@/lib/units";

type OrderSettlePanelProps = {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  taxSettings: TaxSettings;
  discountCode?: string | null;
  onSuccess?: (orderId: string) => void;
  compact?: boolean;
};

export function OrderSettlePanel({
  orderId,
  orderNumber,
  subtotal,
  taxSettings,
  discountCode: initialCode,
  onSuccess,
  compact = false,
}: OrderSettlePanelProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod | null>(null);
  const [discountCode, setDiscountCode] = useState(initialCode ?? "");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const tax = useMemo(
    () => computeOrderTaxAmounts(taxSettings, subtotal, discountAmount, tipAmount),
    [taxSettings, subtotal, discountAmount, tipAmount]
  );

  function settle() {
    if (!paymentMethod) return;
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("paymentMethod", paymentMethod);
    if (discountCode) fd.set("discountCode", discountCode);
    if (tipAmount > 0) fd.set("tipAmount", String(tipAmount));

    startTransition(async () => {
      const result = await settleOrderPayment(fd);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toastError(formatFieldErrors(result.error as Record<string, string[]>));
        return;
      }
      success(`Table closed · ${orderNumber} · ${PAYMENT_METHOD_LABELS[paymentMethod]}`);
      onSuccess?.(orderId);
      router.refresh();
    });
  }

  return (
    <div className={compact ? "space-y-3" : "rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-4"}>
      {!compact && (
        <div>
          <h2 className="text-lg font-semibold text-servora-charcoal">Settle bill</h2>
          <p className="text-sm text-gray-600">
            {orderNumber} · unpaid dine-in tab
          </p>
        </div>
      )}

      <OrderDiscountSection
        subtotal={subtotal}
        onApplied={(p) => {
          setDiscountAmount(p?.discountAmount ?? 0);
          setDiscountCode(p?.code ?? "");
        }}
      />

      <OrderTotalsBreakdown
        subtotal={subtotal}
        discountAmount={discountAmount}
        tax={tax}
        compact
      />

      <TipSelector
        netBeforeTip={
          tax.pricesIncludeTax
            ? Math.max(0, subtotal - discountAmount)
            : Math.max(0, subtotal - discountAmount) + tax.taxTotal
        }
        tipAmount={tipAmount}
        onTipChange={setTipAmount}
        disabled={isPending}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ORDER_PAYMENT_METHODS.map((method) => (
          <button
            key={method}
            type="button"
            disabled={isPending}
            onClick={() => setPaymentMethod(method)}
            className={`rounded-xl border-2 p-3 text-left ${
              paymentMethod === method
                ? "border-servora-yellow bg-yellow-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <span className="font-bold">{PAYMENT_METHOD_LABELS[method]}</span>
            <span className="mt-1 block text-xs text-gray-500">
              {PAYMENT_METHOD_HINTS[method]}
            </span>
          </button>
        ))}
      </div>

      {errors.paymentMethod && (
        <p className="text-sm text-servora-red">{errors.paymentMethod.join(", ")}</p>
      )}
      {Object.keys(errors).length > 0 && !errors.paymentMethod && (
        <p className="text-sm text-servora-red">{formatFieldErrors(errors)}</p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={isPending || !paymentMethod}
        onClick={settle}
      >
        {isPending ? "Closing bill…" : `Settle · ${formatCurrency(tax.grandTotal)}`}
      </Button>
    </div>
  );
}
