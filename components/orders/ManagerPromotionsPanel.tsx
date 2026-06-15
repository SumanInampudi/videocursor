"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  MANAGER_DISCOUNT_LIMITS,
  previewManagerAdjustmentsTotal,
} from "@/lib/promotion-engine/manager";
import type { CompLineInput, ManagerAdjustmentsInput } from "@/lib/promotion-engine/types";
import { formatCurrency } from "@/lib/units";

type CartLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type Props = {
  canManageDiscounts: boolean;
  cartLines: CartLine[];
  promoDiscountTotal: number;
  onAdjustmentsChange: (payload: {
    adjustments: ManagerAdjustmentsInput;
    managerDiscountTotal: number;
  } | null) => void;
};

export function ManagerPromotionsPanel({
  canManageDiscounts,
  cartLines,
  promoDiscountTotal,
  onAdjustmentsChange,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"FIXED" | "PERCENT">("FIXED");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [openDiscount, setOpenDiscount] = useState<ManagerAdjustmentsInput["openDiscount"]>();
  const [compLines, setCompLines] = useState<CompLineInput[]>([]);

  const linePayloads = useMemo(
    () =>
      cartLines.map((line) => ({
        productId: line.productId,
        productName: line.name,
        category: "",
        quantity: line.quantity,
        unitSalePrice: line.unitPrice,
        revenue: line.unitPrice * line.quantity,
      })),
    [cartLines]
  );

  const postPromoLines = useMemo(() => {
    if (promoDiscountTotal <= 0) return linePayloads;
    const subtotal = linePayloads.reduce((sum, line) => sum + line.revenue, 0);
    if (subtotal <= 0) return linePayloads;
    return linePayloads.map((line) => ({
      ...line,
      revenue: Math.round((line.revenue - (line.revenue / subtotal) * promoDiscountTotal) * 100) / 100,
    }));
  }, [linePayloads, promoDiscountTotal]);

  const adjustments = useMemo<ManagerAdjustmentsInput>(
    () => ({
      openDiscount,
      compLines: compLines.length > 0 ? compLines : undefined,
    }),
    [openDiscount, compLines]
  );

  const managerDiscountTotal = useMemo(
    () => previewManagerAdjustmentsTotal(postPromoLines, adjustments),
    [postPromoLines, adjustments]
  );

  function emit(next: ManagerAdjustmentsInput) {
    const total = previewManagerAdjustmentsTotal(postPromoLines, next);
    const hasOpen = Boolean(next.openDiscount);
    const hasComp = Boolean(next.compLines?.length);
    onAdjustmentsChange(
      hasOpen || hasComp ? { adjustments: next, managerDiscountTotal: total } : null
    );
  }

  function applyOpenDiscount() {
    const numericValue = Number(value);
    const trimmedReason = reason.trim();
    if (!trimmedReason || numericValue <= 0) return;

    const next: ManagerAdjustmentsInput = {
      openDiscount: {
        mode,
        value: numericValue,
        reason: trimmedReason,
      },
      compLines: compLines.length > 0 ? compLines : undefined,
    };
    setOpenDiscount(next.openDiscount);
    emit(next);
    setModalOpen(false);
    setValue("");
    setReason("");
  }

  function toggleComp(line: CartLine) {
    const existing = compLines.find((row) => row.productId === line.productId);
    if (existing) {
      const nextComp = compLines.filter((row) => row.productId !== line.productId);
      setCompLines(nextComp);
      emit({
        openDiscount,
        compLines: nextComp.length > 0 ? nextComp : undefined,
      });
      return;
    }

    const compReason = window.prompt(`Reason to comp ${line.name}`, "Service recovery");
    if (!compReason?.trim()) return;
    const nextComp = [...compLines, { productId: line.productId, reason: compReason.trim() }];
    setCompLines(nextComp);
    emit({
      openDiscount,
      compLines: nextComp,
    });
  }

  function clearOpenDiscount() {
    setOpenDiscount(undefined);
    emit({ compLines: compLines.length > 0 ? compLines : undefined });
  }

  if (!canManageDiscounts) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-servora-charcoal">Manager adjustments</p>
        <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
          Open discount
        </Button>
      </div>

      {(openDiscount || compLines.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {openDiscount && (
            <Badge variant="warning">
              Manager · −{formatCurrency(
                previewManagerAdjustmentsTotal(postPromoLines, { openDiscount })
              )}
              <button type="button" className="ml-2 underline" onClick={clearOpenDiscount}>
                Remove
              </button>
            </Badge>
          )}
          {compLines.map((comp) => {
            const line = cartLines.find((row) => row.productId === comp.productId);
            if (!line) return null;
            return (
              <Badge key={comp.productId} variant="warning">
                Comp {line.name}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => toggleComp(line)}
                >
                  Remove
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {managerDiscountTotal > 0 && (
        <p className="text-xs text-amber-900">
          Manager savings: −{formatCurrency(managerDiscountTotal)}
        </p>
      )}

      <div className="space-y-1">
        {cartLines.map((line) => {
          const isComped = compLines.some((row) => row.productId === line.productId);
          return (
            <div key={line.productId} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{line.name}</span>
              <button
                type="button"
                className={`font-medium ${isComped ? "text-amber-900" : "text-brand-700"}`}
                onClick={() => toggleComp(line)}
              >
                {isComped ? "Comped" : "Comp line"}
              </button>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-servora-charcoal">Manager discount</h3>
            <p className="mt-1 text-xs text-gray-500">
              Max ₹{MANAGER_DISCOUNT_LIMITS.maxAmount} or {MANAGER_DISCOUNT_LIMITS.maxPercent}% ·
              reason required
            </p>
            <div className="mt-4 space-y-3">
              <Select
                label="Type"
                value={mode}
                onChange={(event) => setMode(event.target.value as "FIXED" | "PERCENT")}
                options={[
                  { value: "FIXED", label: "Fixed amount (₹)" },
                  { value: "PERCENT", label: "Percent (%)" },
                ]}
              />
              <Input
                label="Value"
                type="number"
                min="0.01"
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <Input
                label="Reason *"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Guest wait, wrong order, etc."
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={applyOpenDiscount}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
