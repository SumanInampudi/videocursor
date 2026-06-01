"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getOrderFulfillmentPreview, updateOrderStatus } from "@/app/actions/orders";
import { confirmAction, useToast } from "@/components/ui/Toast";
import { formatTimeIST } from "@/lib/format";
import { OrderStatus } from "@prisma/client";

type KitchenOrderCardProps = {
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    status: OrderStatus;
    createdAt: Date;
    lineItems: {
      id: string;
      quantity: number;
      recipeName: string;
      recipe: { name: string } | null;
    }[];
  };
  nextAction?: { label: string; status: OrderStatus };
  accent: "new" | "processing" | "ready";
};

const ACCENT_LEFT = {
  new: "border-l-amber-400",
  processing: "border-l-blue-400",
  ready: "border-l-green-500",
};

function displayName(order: KitchenOrderCardProps["order"]) {
  const name = order.customerName?.trim();
  return name || order.orderNumber;
}

export function KitchenOrderCard({ order, nextAction, accent }: KitchenOrderCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const hasCustomer = Boolean(order.customerName?.trim());

  function handleAdvance() {
    if (!nextAction) return;

    const needsStockCheck =
      nextAction.status === OrderStatus.READY && order.status === OrderStatus.PROCESSING;

    startTransition(async () => {
      if (needsStockCheck) {
        const preview = await getOrderFulfillmentPreview(order.id);
        if (preview.error) {
          toastError(preview.error);
          return;
        }
        if (!preview.ok && preview.issues?.length) {
          const proceed = confirmAction(
            `Stock issues:\n${preview.issues.join("\n")}\n\nMark ready anyway?`
          );
          if (!proceed) return;
        }
      }

      const result = await updateOrderStatus(order.id, nextAction.status);
      if (result.error) {
        toastError(result.error);
        return;
      }
      success(`${order.orderNumber} → ${nextAction.label}`);
      router.refresh();
    });
  }

  return (
    <article
      className={`flex flex-col rounded-md border border-gray-200 border-l-[3px] bg-white p-2 shadow-sm ${ACCENT_LEFT[accent]}`}
    >
      <div className="mb-1 min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-servora-charcoal">
          {displayName(order)}
        </p>
        {hasCustomer && (
          <p className="truncate text-[10px] font-medium text-gray-500">{order.orderNumber}</p>
        )}
        <time className="text-[10px] text-gray-400">{formatTimeIST(order.createdAt)}</time>
      </div>

      <ul className="mb-1.5 flex-1 space-y-0.5 border-t border-gray-100 pt-1">
        {order.lineItems.map((line) => (
          <li key={line.id} className="text-xs leading-snug text-gray-700">
            <span className="font-bold tabular-nums text-servora-charcoal">{line.quantity}×</span>{" "}
            <span className="font-medium">{line.recipe?.name ?? line.recipeName}</span>
          </li>
        ))}
      </ul>

      {nextAction && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleAdvance}
          className="mt-auto w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-semibold text-servora-charcoal transition-colors hover:border-servora-yellow hover:bg-servora-yellow hover:text-white disabled:opacity-50"
        >
          {isPending ? "…" : nextAction.label}
        </button>
      )}
    </article>
  );
}
