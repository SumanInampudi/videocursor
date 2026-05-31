"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateOrderStatus } from "@/app/actions/orders";
import { RecipeBarcode } from "@/components/recipes/RecipeBarcode";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatQuantity } from "@/lib/units";
import { OrderStatus } from "@prisma/client";

type OrderDetailProps = {
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    notes: string | null;
    status: OrderStatus;
    createdAt: Date;
    processedAt: Date | null;
    readyAt: Date | null;
    deliveredAt: Date | null;
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

const NEXT: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  NEW: { label: "Start processing", status: OrderStatus.PROCESSING },
  PROCESSING: { label: "Mark ready (deduct stock)", status: OrderStatus.READY },
  READY: { label: "Mark delivered", status: OrderStatus.DELIVERED },
};

export function OrderDetail({ order }: OrderDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalRevenue = order.lineItems.reduce(
    (sum, line) => sum + Number(line.unitSalePrice) * line.quantity,
    0
  );
  const totalCost = order.lineItems.reduce(
    (sum, line) => sum + Number(line.ingredientCost ?? 0),
    0
  );
  const totalProfit = order.lineItems.reduce(
    (sum, line) => sum + Number(line.profit ?? 0),
    0
  );
  const allProcessed = order.lineItems.every((l) => l.processedAt != null);

  const next = NEXT[order.status];

  function advance() {
    if (!next) return;
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, next.status);
      if (result.error) alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">{order.orderNumber}</h1>
          {order.customerName && (
            <p className="text-sm text-gray-600">{order.customerName}</p>
          )}
          <div className="mt-2">
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
          </div>
        </div>
        {next && (
          <Button disabled={isPending} onClick={advance}>
            {next.label}
          </Button>
        )}
      </div>

      {order.notes && (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{order.notes}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Revenue" value={formatCurrency(totalRevenue)} />
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
          const revenue = Number(line.unitSalePrice) * line.quantity;
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
    case OrderStatus.READY:
      return "success";
    case OrderStatus.DELIVERED:
      return "success";
    default:
      return "default";
  }
}
