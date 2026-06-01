"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getOrderFulfillmentPreview, updateOrderStatus } from "@/app/actions/orders";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { canCancelOrder } from "@/lib/order-cancel";
import { confirmAction, useToast } from "@/components/ui/Toast";
import { OrderTimerBadge } from "@/components/kitchen/OrderTimerBadge";
import { KitchenPrepHint } from "@/components/kitchen/KitchenPrepHint";
import { formatTimeIST } from "@/lib/format";
import { getStageAnchor, getTotalAnchor, type KdsThresholds } from "@/lib/kds-timers";
import { orderChannelLabel, orderTicketLabel } from "@/lib/order-channel";
import { OrderChannel, OrderStatus } from "@prisma/client";

type KitchenOrderCardProps = {
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    channel: OrderChannel;
    tableLabel: string | null;
    externalRef: string | null;
    status: OrderStatus;
    createdAt: Date;
    processedAt?: Date | string | null;
    readyAt?: Date | string | null;
    estimatedPrepMinutes?: number | null;
    lineItems: {
      id: string;
      quantity: number;
      recipeName: string;
      recipe: { name: string } | null;
    }[];
  };
  nextAction?: { label: string; status: OrderStatus };
  accent: "new" | "processing" | "ready";
  thresholds: KdsThresholds;
};

const ACCENT_LEFT = {
  new: "border-l-amber-400",
  processing: "border-l-blue-400",
  ready: "border-l-green-500",
};

export function KitchenOrderCard({
  order,
  nextAction,
  accent,
  thresholds,
}: KitchenOrderCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const title = orderTicketLabel(order);
  const stageAnchor = getStageAnchor(order);
  const totalAnchor = getTotalAnchor(order);

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
      <div className="mb-1 flex items-start justify-between gap-1 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-servora-charcoal">{title}</p>
          <p className="text-[10px] text-gray-500">
            {orderChannelLabel(order.channel)} · {order.orderNumber} ·{" "}
            {formatTimeIST(order.createdAt)}
          </p>
          <KitchenPrepHint
            stageSince={stageAnchor}
            totalSince={totalAnchor}
            estimatedPrepMinutes={order.estimatedPrepMinutes ?? null}
            thresholds={thresholds}
          />
        </div>
        <OrderTimerBadge
          since={stageAnchor}
          thresholds={thresholds}
          estimatedPrepMinutes={order.estimatedPrepMinutes}
          label={
            order.status === "NEW"
              ? "Wait"
              : order.status === "PROCESSING"
                ? "Cook"
                : "Ready"
          }
        />
      </div>

      <ul className="mb-1.5 flex-1 space-y-0.5 border-t border-gray-100 pt-1">
        {order.lineItems.map((line) => (
          <li key={line.id} className="text-xs leading-snug text-gray-700">
            <span className="font-bold tabular-nums text-servora-charcoal">{line.quantity}×</span>{" "}
            <span className="font-medium">{line.recipe?.name ?? line.recipeName}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-1">
        {nextAction && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleAdvance}
            className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-semibold text-servora-charcoal transition-colors hover:border-servora-yellow hover:bg-servora-yellow hover:text-white disabled:opacity-50"
          >
            {isPending ? "…" : nextAction.label}
          </button>
        )}
        {canCancelOrder(order.status) &&
          (order.status === "NEW" || order.status === "PROCESSING") && (
            <CancelOrderButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              status={order.status}
              label="Cancel"
              variant="secondary"
              className="[&_input]:hidden [&_button]:w-full [&_button]:py-1 [&_button]:text-[10px]"
            />
          )}
      </div>
    </article>
  );
}
