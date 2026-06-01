"use client";

import { OrderSettlePanel } from "@/components/orders/OrderSettlePanel";

type PosSettleModalProps = {
  open: boolean;
  orderId: string;
  orderNumber: string;
  subtotal: number;
  total: number;
  discountCode?: string | null;
  onClose: () => void;
  onSettled: () => void;
};

export function PosSettleModal({
  open,
  orderId,
  orderNumber,
  subtotal,
  total,
  discountCode,
  onClose,
  onSettled,
}: PosSettleModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
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
          total={total}
          discountCode={discountCode}
          compact
          onSuccess={() => {
            onSettled();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
