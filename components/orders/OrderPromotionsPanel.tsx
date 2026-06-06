"use client";

import { useEffect, useState, useTransition } from "react";
import { evaluatePromotionsForCart } from "@/app/actions/discounts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/units";
import type { OrderChannel, OrderPaymentMethod } from "@prisma/client";

type AppliedRow = {
  name: string;
  code: string | null;
  discountAmount: number;
  kind: string;
};

type HintRow = {
  name: string;
  message: string;
  kind: string;
};

type Props = {
  subtotal: number;
  channel?: OrderChannel;
  customerId?: string;
  paymentMethod?: OrderPaymentMethod;
  cartLines: { productId: string; quantity: number }[];
  onApplied: (payload: {
    code: string;
    discountAmount: number;
    promotions: AppliedRow[];
  } | null) => void;
};

export function OrderPromotionsPanel({
  subtotal,
  channel = "DINE_IN",
  customerId,
  paymentMethod,
  cartLines,
  onApplied,
}: Props) {
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [autoPromotions, setAutoPromotions] = useState<AppliedRow[]>([]);
  const [eligibilityHints, setEligibilityHints] = useState<HintRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function evaluate(nextCode = appliedCode) {
    if (subtotal <= 0 || cartLines.length === 0) {
      setAutoPromotions([]);
      setEligibilityHints([]);
      setDiscountAmount(0);
      onApplied(null);
      return;
    }

    startTransition(async () => {
      const result = await evaluatePromotionsForCart({
        subtotal,
        channel,
        cartLines,
        customerId: customerId || undefined,
        paymentMethod,
        discountCode: nextCode || undefined,
      });

      if ("error" in result) {
        setMessage(result.error ?? "Could not apply promotion");
        if (nextCode) {
          setAppliedCode("");
          onApplied(null);
        }
        return;
      }

      setAutoPromotions(result.autoPromotions);
      setEligibilityHints(result.eligibilityHints ?? []);
      setDiscountAmount(result.discountTotal);
      setMessage(
        result.discountTotal > 0
          ? `Total savings: −${formatCurrency(result.discountTotal)}`
          : null
      );

      onApplied(
        result.discountTotal > 0
          ? {
              code: result.discountCode ?? nextCode,
              discountAmount: result.discountTotal,
              promotions: result.appliedPromotions,
            }
          : null
      );
    });
  }

  useEffect(() => {
    evaluate(appliedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, channel, cartLines, appliedCode, customerId, paymentMethod]);

  function applyCode() {
    const next = code.trim().toUpperCase();
    if (!next) return;
    setAppliedCode(next);
    setCode(next);
    evaluate(next);
  }

  function clearCode() {
    setCode("");
    setAppliedCode("");
    evaluate("");
  }

  return (
    <div className="filter-bar space-y-3">
      <p className="text-sm font-medium text-servora-charcoal">Promotions</p>

      {autoPromotions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {autoPromotions.map((promotion) => (
            <Badge key={`${promotion.name}-${promotion.discountAmount}`} variant="success">
              {promotion.name} · −{formatCurrency(promotion.discountAmount)}
            </Badge>
          ))}
        </div>
      )}

      {eligibilityHints.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {eligibilityHints.map((hint) => (
            <Badge key={`${hint.name}-${hint.message}`} variant="warning">
              {hint.name}: {hint.message}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          name="discountCodeInput"
          placeholder="Promo code (optional)"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          disabled={Boolean(appliedCode)}
          className="max-w-[200px]"
        />
        {!appliedCode ? (
          <Button
            type="button"
            variant="secondary"
            onClick={applyCode}
            disabled={isPending || subtotal <= 0 || !code.trim()}
          >
            {isPending ? "Checking…" : "Apply code"}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={clearCode}>
            Remove code
          </Button>
        )}
      </div>

      {message && (
        <p className={`text-xs ${discountAmount > 0 ? "text-green-700" : "text-red-600"}`}>
          {message}
        </p>
      )}

      <input type="hidden" name="discountCode" value={appliedCode} />
    </div>
  );
}
