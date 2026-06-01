"use client";

import { useState, useTransition } from "react";
import { validateDiscountForOrder } from "@/app/actions/discounts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/units";

type Props = {
  subtotal: number;
  onApplied: (payload: { code: string; discountAmount: number } | null) => void;
};

export function OrderDiscountSection({ subtotal, onApplied }: Props) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; discountAmount: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply() {
    if (!code.trim()) return;
    startTransition(async () => {
      const result = await validateDiscountForOrder(code.trim(), subtotal);
      if (!("success" in result) || !result.success) {
        setMessage(("error" in result ? result.error : null) ?? "Invalid code");
        setApplied(null);
        onApplied(null);
        return;
      }
      const payload = { code: code.trim().toUpperCase(), discountAmount: result.discountAmount };
      setApplied(payload);
      setMessage(`Applied: −${formatCurrency(result.discountAmount)}`);
      onApplied(payload);
    });
  }

  function clear() {
    setCode("");
    setApplied(null);
    setMessage(null);
    onApplied(null);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <p className="text-sm font-medium text-servora-charcoal">Discount code</p>
      <div className="flex flex-wrap gap-2">
        <Input
          name="discountCodeInput"
          placeholder="e.g. SUMMER20"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={!!applied}
          className="max-w-[200px]"
        />
        {!applied ? (
          <Button type="button" variant="secondary" onClick={apply} disabled={isPending || subtotal <= 0}>
            {isPending ? "Checking…" : "Apply"}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={clear}>
            Remove
          </Button>
        )}
      </div>
      {message && <p className={`text-xs ${applied ? "text-green-700" : "text-red-600"}`}>{message}</p>}
      <input type="hidden" name="discountCode" value={applied?.code ?? ""} />
    </div>
  );
}
