"use client";

import { OrderSettlePanel } from "@/components/orders/OrderSettlePanel";
import type { TaxSettings } from "@/lib/tax-settings";

type PosSettleModalProps = {
  open: boolean;
  orderId: string;
  orderNumber: string;
  subtotal: number;
  taxSettings: TaxSettings;
  discountCode?: string | null;
  canManageDiscounts?: boolean;
  onClose: () => void;
  onSettled: (orderId: string) => void;
};

export function PosSettleModal({
  open,
  orderId,
  orderNumber,
  subtotal,
  taxSettings,
  discountCode,
  canManageDiscounts = false,
  onClose,
  onSettled,
}: PosSettleModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface-card p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-servora-charcoal">Close table</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
        <OrderSettlePanel
          orderId={orderId}
          orderNumber={orderNumber}
          subtotal={subtotal}
          taxSettings={taxSettings}
          discountCode={discountCode}
          canManageDiscounts={canManageDiscounts}
          compact
          onSuccess={(id) => {
            onSettled(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
