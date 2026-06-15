"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrder } from "@/app/actions/orders";
import { Button } from "@/components/ui/Button";
import { confirmAction, useToast } from "@/components/ui/Toast";
import { cancelRequiresStockRestore } from "@/lib/order-cancel";
import type { OrderStatus } from "@prisma/client";

type CancelOrderButtonProps = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  variant?: "danger" | "secondary";
  className?: string;
  label?: string;
};

export function CancelOrderButton({
  orderId,
  orderNumber,
  status,
  variant = "danger",
  className,
  label = "Cancel order",
}: CancelOrderButtonProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function handleCancel() {
    const stockNote = cancelRequiresStockRestore(status)
      ? "\n\nRaw material stock deducted at Ready will be restored."
      : "\n\nNo stock has been deducted yet.";

    if (
      !confirmAction(
        `Cancel order ${orderNumber}?${stockNote}\n\nContinue?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await cancelOrder(orderId, reason);
      if (result.error) {
        toastError(result.error);
        return;
      }
      success(`${orderNumber} cancelled`);
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <input
        type="text"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mb-2 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <Button
        type="button"
        variant={variant}
        disabled={isPending}
        onClick={handleCancel}
      >
        {isPending ? "Cancelling…" : label}
      </Button>
    </div>
  );
}
