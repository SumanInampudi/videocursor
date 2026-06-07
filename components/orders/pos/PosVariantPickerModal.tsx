"use client";

import { Button } from "@/components/ui/Button";
import { formatCurrency, formatQuantity } from "@/lib/units";
import type { PosVariantGroup } from "@/lib/pos-variant-groups";
import type { PosProductAvailability } from "@/lib/pos-stock-status";
import type { PricedProduct } from "@/lib/order-cart";

type PosVariantPickerModalProps = {
  group: PosVariantGroup | null;
  availability: Record<string, PosProductAvailability>;
  onSelect: (product: PricedProduct & PosVariantGroup["variants"][0]) => void;
  onClose: () => void;
  disabled?: boolean;
};

export function PosVariantPickerModal({
  group,
  availability,
  onSelect,
  onClose,
  disabled,
}: PosVariantPickerModalProps) {
  if (!group) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="pos-variant-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="pos-variant-picker-title" className="text-lg font-bold text-servora-charcoal">
            {group.name}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">Choose a pack size</p>
        </div>
        <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
          {group.variants.map((variant) => {
            const avail = availability[variant.id];
            const out =
              avail?.status === "out" || avail?.status === "unavailable";
            const price = variant.salePrice ?? 0;
            return (
              <li key={variant.id}>
                <button
                  type="button"
                  disabled={disabled || out}
                  onClick={() => onSelect(variant as PricedProduct & typeof variant)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div>
                    <p className="font-medium text-servora-charcoal">
                      {variant.variantLabel ?? variant.name}
                    </p>
                    {variant.variantOutputQuantity != null && (
                      <p className="text-xs text-gray-500">
                        {formatQuantity(variant.variantOutputQuantity, group.yieldUnit)} per sale
                      </p>
                    )}
                    {avail && avail.status !== "ok" && (
                      <p className={`text-xs font-medium ${out ? "text-red-600" : "text-amber-600"}`}>
                        {out ? "Out of stock" : avail.label}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-servora-charcoal">
                      {formatCurrency(price)}
                    </p>
                    {variant.posCode != null && (
                      <p className="text-xs text-gray-400">#{variant.posCode}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-3">
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
