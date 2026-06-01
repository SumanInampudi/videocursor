"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/actions/orders";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { OrderReceiptModal } from "@/components/orders/OrderReceiptModal";
import { OrderSettlePanel } from "@/components/orders/OrderSettlePanel";
import { OrderTaxSummary } from "@/components/orders/OrderTaxSummary";
import { OrderStageTimeline } from "@/components/orders/OrderStageTimeline";
import {
  ADVANCE_ACTION_LABEL,
  nextStatusForChannel,
} from "@/lib/order-pipeline";
import { canCancelOrder } from "@/lib/order-cancel";
import { isOpenTableOrder } from "@/lib/table-tabs";
import { orderChannelLabel } from "@/lib/order-channel";
import { formatDateTimeIST } from "@/lib/format";
import { formatPaymentMethod } from "@/lib/pos-payment";
import { RecipeBarcode } from "@/components/recipes/RecipeBarcode";
import {
  OrderMetaBadges,
  computeOrderDisplayTotal,
} from "@/components/orders/OrderMetaBadges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatQuantity } from "@/lib/units";
import type { TaxSettings } from "@/lib/tax-settings";
import { OrderStatus } from "@prisma/client";

type OrderDetailProps = {
  taxSettings: TaxSettings;
  order: {
    id: string;
    orderNumber: string;
    channel: import("@prisma/client").OrderChannel;
    tableLabel?: string | null;
    diningTableId?: string | null;
    customerId?: string | null;
    customerName: string | null;
    customer?: { id: string; name: string } | null;
    discountCode?: string | null;
    discountTotal?: number | { toString(): string } | null;
    subtotal?: number | { toString(): string } | null;
    grandTotal?: number | { toString(): string } | null;
    taxTotal?: number | { toString(): string } | null;
    tipAmount?: number | { toString(): string } | null;
    gstRatePercent?: number | { toString(): string } | null;
    cgstAmount?: number | { toString(): string } | null;
    sgstAmount?: number | { toString(): string } | null;
    igstAmount?: number | { toString(): string } | null;
    pricesIncludeTax?: boolean | null;
    paymentMethod?: "CASH" | "CARD" | "PHONEPE" | null;
    paidAt?: Date | string | null;
    notes: string | null;
    status: OrderStatus;
    createdAt: Date;
    processedAt: Date | null;
    packingAt?: Date | null;
    readyAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt?: Date | null;
    lineItems: {
      id: string;
      quantity: number;
      unitSalePrice: { toString(): string };
      ingredientCost: { toString(): string } | null;
      revenue: { toString(): string } | null;
      profit: { toString(): string } | null;
      processedAt: Date | null;
      recipeName: string;
      recipe: {
        id: string;
        name: string;
        barcode: string;
        yieldUnit: string;
      } | null;
      consumptions: {
        id: string;
        quantityDeducted: { toString(): string };
        unit: string;
        costPerUnit: { toString(): string };
        lineCost: { toString(): string };
        inventoryItem: { name: string; sku: string };
      }[];
    }[];
  };
};

export function OrderDetail({ order, taxSettings }: OrderDetailProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { subtotal, discount, total: orderTotal } = computeOrderDisplayTotal(order);
  const displayRevenue = orderTotal;
  const totalCost = order.lineItems.reduce(
    (sum, line) => sum + Number(line.ingredientCost ?? 0),
    0
  );
  const totalProfit = order.lineItems.reduce(
    (sum, line) => sum + Number(line.profit ?? 0),
    0
  );
  const allProcessed = order.lineItems.every((l) => l.processedAt != null);

  const channel = order.channel ?? "DINE_IN";
  const nextStatus = nextStatusForChannel(order.status, channel);
  const next =
    nextStatus != null
      ? {
          status: nextStatus,
          label: ADVANCE_ACTION_LABEL[nextStatus] ?? nextStatus,
        }
      : undefined;
  const openTab =
    order.channel != null &&
    isOpenTableOrder({
      channel: order.channel,
      paidAt: order.paidAt ?? null,
      status: order.status,
    });

  function advance() {
    if (!next) return;
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, next.status);
      if (result.error) toastError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">{order.orderNumber}</h1>
          <OrderMetaBadges order={order} />
          <div className="mt-2">
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4 no-print">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              Print kitchen ticket
            </Button>
            {order.paidAt && (
              <Button type="button" variant="secondary" onClick={() => setReceiptOpen(true)}>
                View receipt
              </Button>
            )}
            {next && (
              <Button disabled={isPending} onClick={advance}>
                {next.label}
              </Button>
            )}
          </div>
          {canCancelOrder(order.status) && (
            <CancelOrderButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              status={order.status}
            />
          )}
        </div>
      </div>

      {openTab && (
        <div className="space-y-4 no-print">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>Open table bill</strong>
            {order.channel && ` · ${orderChannelLabel(order.channel)}`}
            {order.tableLabel ? ` · ${order.tableLabel}` : ""}
            {" · "}
            <a href={`/orders/pos`} className="font-medium underline">
              Add items on register
            </a>
          </p>
          <OrderSettlePanel
            orderId={order.id}
            orderNumber={order.orderNumber}
            subtotal={subtotal}
            taxSettings={taxSettings}
            discountCode={order.discountCode}
            onSuccess={() => setReceiptOpen(true)}
          />
        </div>
      )}

      {order.paymentMethod && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <strong>Payment:</strong> {formatPaymentMethod(order.paymentMethod)}
          {order.paidAt && (
            <span className="text-green-700">
              {" "}
              · {formatDateTimeIST(order.paidAt)}
            </span>
          )}
        </p>
      )}

      {order.notes && (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{order.notes}</p>
      )}

      <OrderTaxSummary order={order} />

      <OrderStageTimeline order={order} />

      <OrderReceiptModal
        orderId={order.id}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Revenue" value={formatCurrency(displayRevenue)} />
        <SummaryCard
          label="Ingredient cost"
          value={allProcessed ? formatCurrency(totalCost) : "Pending (at ready)"}
        />
        <SummaryCard
          label="Profit"
          value={allProcessed ? formatCurrency(totalProfit) : "Pending (at ready)"}
          highlight={allProcessed && totalProfit < 0 ? "danger" : undefined}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-servora-charcoal">Line items</h2>
        {order.lineItems.map((line) => {
          const revenue =
            line.revenue != null
              ? Number(line.revenue)
              : Number(line.unitSalePrice) * line.quantity;
          const unitCost =
            line.ingredientCost != null
              ? Number(line.ingredientCost) / line.quantity
              : null;

          return (
            <div key={line.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-servora-charcoal">
                    {line.quantity}× {line.recipe?.name ?? line.recipeName}
                    {!line.recipe && (
                      <span className="ml-1 text-xs text-gray-400">(recipe removed)</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(Number(line.unitSalePrice))} / batch · Revenue{" "}
                    {formatCurrency(revenue)}
                  </p>
                  {unitCost != null && (
                    <p className="mt-1 text-sm text-gray-600">
                      Unit ingredient cost: {formatCurrency(unitCost)} · Profit:{" "}
                      <span
                        className={
                          Number(line.profit ?? 0) < 0 ? "text-servora-red" : "text-green-700"
                        }
                      >
                        {formatCurrency(Number(line.profit ?? 0))}
                      </span>
                    </p>
                  )}
                </div>
                {line.recipe && <RecipeBarcode barcode={line.recipe.barcode} />}
              </div>

              {line.consumptions.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                    Inventory deducted
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {line.consumptions.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2">
                        <span>
                          {c.inventoryItem.name} ({c.inventoryItem.sku})
                        </span>
                        <span>
                          {formatQuantity(Number(c.quantityDeducted), c.unit)} @{" "}
                          {formatCurrency(Number(c.costPerUnit))} ={" "}
                          {formatCurrency(Number(c.lineCost))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <dl className="grid gap-2 text-sm text-gray-500 sm:grid-cols-2">
        <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
        {order.processedAt && (
          <div>Processing started: {new Date(order.processedAt).toLocaleString()}</div>
        )}
        {order.packingAt && (
          <div>Packing started: {new Date(order.packingAt).toLocaleString()}</div>
        )}
        {order.readyAt && (
          <div>Ready: {new Date(order.readyAt).toLocaleString()}</div>
        )}
        {order.deliveredAt && (
          <div>Delivered: {new Date(order.deliveredAt).toLocaleString()}</div>
        )}
      </dl>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "danger";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          highlight === "danger" ? "text-servora-red" : "text-servora-charcoal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function statusVariant(status: OrderStatus): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case OrderStatus.NEW:
      return "warning";
    case OrderStatus.PROCESSING:
      return "default";
    case OrderStatus.PACKING:
      return "default";
    case OrderStatus.READY:
      return "success";
    case OrderStatus.DELIVERED:
      return "success";
    default:
      return "default";
  }
}
