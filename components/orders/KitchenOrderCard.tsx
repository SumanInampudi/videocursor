"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  acknowledgeKitchenOrder,
  getKitchenPackWarning,
} from "@/app/actions/kitchen";
import { getOrderFulfillmentPreview, updateOrderStatus } from "@/app/actions/orders";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { KitchenLineRow } from "@/components/kitchen/KitchenLineRow";
import { canCancelOrder } from "@/lib/order-cancel";
import { confirmAction, useToast } from "@/components/ui/Toast";
import { OrderTimerBadge } from "@/components/kitchen/OrderTimerBadge";
import { KitchenPrepHint } from "@/components/kitchen/KitchenPrepHint";
import { formatTimeIST } from "@/lib/format";
import { getStageAnchor, getTotalAnchor, type KdsThresholds } from "@/lib/kds-timers";
import {
  countNewKitchenLines,
  kitchenLineProgress,
  orderNeedsKitchenAttention,
} from "@/lib/kitchen-kds";
import { orderChannelLabel, orderTicketLabel } from "@/lib/order-channel";
import { statusDeductionOnTransition } from "@/lib/order-pipeline";
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
    kitchenAcknowledgedAt?: Date | string | null;
    kitchenBumpedAt?: Date | string | null;
    processedAt?: Date | string | null;
    packingAt?: Date | string | null;
    readyAt?: Date | string | null;
    estimatedPrepMinutes?: number | null;
    lineItems: {
      id: string;
      quantity: number;
      productName: string;
      addedAt: Date | string;
      kitchenDoneAt?: Date | string | null;
      kitchenDoneQty?: number;
      product: { name: string } | null;
    }[];
  };
  nextAction?: { label: string; status: OrderStatus };
  accent: "new" | "processing" | "packing" | "ready";
  thresholds: KdsThresholds;
};

const ACCENT_LEFT = {
  new: "border-l-amber-400",
  processing: "border-l-blue-400",
  packing: "border-l-violet-500",
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
  const [ackPending, startAck] = useTransition();
  const { success, error: toastError } = useToast();

  const title = orderTicketLabel(order);
  const stageAnchor = getStageAnchor(order);
  const totalAnchor = getTotalAnchor(order);
  const needsAttention = orderNeedsKitchenAttention(order);
  const newCount = countNewKitchenLines(order);
  const { done, total } = kitchenLineProgress(order.lineItems);
  const allLinesDone = total > 0 && done === total;

  function handleAcknowledge() {
    startAck(async () => {
      const result = await acknowledgeKitchenOrder(order.id);
      if (result.error) toastError(result.error);
      else router.refresh();
    });
  }

  function handleAdvance() {
    if (!nextAction) return;

    const needsStockCheck = statusDeductionOnTransition(
      order.status,
      nextAction.status,
      order.channel
    );

    startTransition(async () => {
      if (needsStockCheck) {
        const packHint = await getKitchenPackWarning(order.id);
        if (packHint.incomplete) {
          const proceedItems = confirmAction(
            `${packHint.done}/${packHint.total} items marked done on the ticket.\n\nPack anyway?`
          );
          if (!proceedItems) return;
        }

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
      className={`flex flex-col rounded-md border bg-white p-2 shadow-sm transition-shadow ${ACCENT_LEFT[accent]} ${
        needsAttention
          ? "kitchen-card-attention border-amber-300 border-l-[3px] ring-2 ring-amber-200/60"
          : "border-gray-200 border-l-[3px]"
      }`}
    >
      {needsAttention && (
        <div className="mb-1 flex items-center justify-between gap-1 rounded bg-amber-100 px-1.5 py-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900">
            {newCount > 0 ? `${newCount} new item${newCount === 1 ? "" : "s"}` : "Updated order"}
          </span>
          <button
            type="button"
            disabled={ackPending}
            onClick={handleAcknowledge}
            className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {ackPending ? "…" : "Got it"}
          </button>
        </div>
      )}

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

      {total > 0 && (
        <div className="mb-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                allLinesDone ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-gray-600">
            {done}/{total} items
          </span>
        </div>
      )}

      <ul className="mb-1.5 flex-1 space-y-0.5 border-t border-gray-100 pt-1">
        {order.lineItems.map((line) => (
          <KitchenLineRow
            key={line.id}
            line={line}
            order={order}
            disabled={isPending}
          />
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
