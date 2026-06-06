"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleOrderPayment } from "@/app/actions/table-service";
import { ManagerPromotionsPanel } from "@/components/orders/ManagerPromotionsPanel";
import { OrderPromotionsPanel } from "@/components/orders/OrderPromotionsPanel";
import { serializeManagerAdjustmentsForForm } from "@/lib/promotion-engine/manager";
import type { ManagerAdjustmentsInput } from "@/lib/promotion-engine/types";
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
import type { OrderChannel } from "@prisma/client";

type OrderSettlePanelProps = {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  taxSettings: TaxSettings;
  discountCode?: string | null;
  channel?: OrderChannel;
  cartLines?: { productId: string; quantity: number; name?: string; unitPrice?: number }[];
  canManageDiscounts?: boolean;
  onSuccess?: (orderId: string) => void;
  compact?: boolean;
};

export function OrderSettlePanel({
  orderId,
  orderNumber,
  subtotal,
  taxSettings,
  discountCode: initialCode,
  channel = "DINE_IN",
  cartLines = [],
  canManageDiscounts = false,
  onSuccess,
  compact = false,
}: OrderSettlePanelProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod | null>(null);
  const [discountCode, setDiscountCode] = useState(initialCode ?? "");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [managerDiscount, setManagerDiscount] = useState(0);
  const [managerAdjustments, setManagerAdjustments] = useState<ManagerAdjustmentsInput>({});
  const [tipAmount, setTipAmount] = useState(0);
  const discountAmount = promoDiscount + managerDiscount;
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
    const managerFields = serializeManagerAdjustmentsForForm(managerAdjustments);
    if (managerFields.managerDiscountMode) {
      fd.set("managerDiscountMode", managerFields.managerDiscountMode);
    }
    if (managerFields.managerDiscountValue) {
      fd.set("managerDiscountValue", managerFields.managerDiscountValue);
    }
    if (managerFields.managerDiscountReason) {
      fd.set("managerDiscountReason", managerFields.managerDiscountReason);
    }
    if (managerFields.compLinesJson) {
      fd.set("compLinesJson", managerFields.compLinesJson);
    }

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
          <h2 className="section-title">Settle bill</h2>
          <p className="text-sm text-gray-600">
            {orderNumber} · unpaid dine-in tab
          </p>
        </div>
      )}

      <OrderPromotionsPanel
        subtotal={subtotal}
        channel={channel}
        customerId={undefined}
        paymentMethod={paymentMethod ?? undefined}
        cartLines={cartLines}
        onApplied={(p) => {
          setPromoDiscount(p?.discountAmount ?? 0);
          setDiscountCode(p?.code ?? "");
        }}
      />

      <ManagerPromotionsPanel
        canManageDiscounts={canManageDiscounts}
        cartLines={cartLines.map((line) => ({
          productId: line.productId,
          name: line.name ?? "Item",
          quantity: line.quantity,
          unitPrice: line.unitPrice ?? 0,
        }))}
        promoDiscountTotal={promoDiscount}
        onAdjustmentsChange={(payload) => {
          if (!payload) {
            setManagerAdjustments({});
            setManagerDiscount(0);
            return;
          }
          setManagerAdjustments(payload.adjustments);
          setManagerDiscount(payload.managerDiscountTotal);
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
