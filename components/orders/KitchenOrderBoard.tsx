"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { KitchenOrderCard } from "@/components/orders/KitchenOrderCard";
import { useKitchenChime } from "@/components/kitchen/useKitchenChime";
import type { KdsThresholds } from "@/lib/kds-timers";
import { getKitchenNextAction } from "@/lib/order-pipeline";
import { sortKitchenBoardOrders } from "@/lib/kitchen-kds";
import { OrderStatus } from "@prisma/client";

type KitchenOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  channel: import("@prisma/client").OrderChannel;
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
    product: { name: string; yieldUnit: string } | null;
  }[];
};

type KitchenOrderBoardProps = {
  grouped: {
    NEW: KitchenOrder[];
    PROCESSING: KitchenOrder[];
    PACKING: KitchenOrder[];
    READY: KitchenOrder[];
  };
  thresholds: KdsThresholds;
};

const COLUMNS: {
  status: keyof KitchenOrderBoardProps["grouped"];
  title: string;
  accent: "new" | "processing" | "packing" | "ready";
  sectionClass: string;
  countClass: string;
  nextAction?: { label: string; status: OrderStatus };
}[] = [
  {
    status: "NEW",
    title: "New",
    accent: "new",
    sectionClass: "border-amber-200 bg-amber-50",
    countClass: "bg-amber-100 text-amber-900",
    nextAction: { label: "Start", status: OrderStatus.PROCESSING },
  },
  {
    status: "PROCESSING",
    title: "Cooking",
    accent: "processing",
    sectionClass: "border-blue-200 bg-blue-50",
    countClass: "bg-blue-100 text-blue-900",
    nextAction: { label: "Pack", status: OrderStatus.PACKING },
  },
  {
    status: "PACKING",
    title: "Packing",
    accent: "packing",
    sectionClass: "border-violet-200 bg-violet-50",
    countClass: "bg-violet-100 text-violet-900",
    nextAction: { label: "Ready", status: OrderStatus.READY },
  },
  {
    status: "READY",
    title: "Ready",
    accent: "ready",
    sectionClass: "border-green-200 bg-green-50",
    countClass: "bg-green-100 text-green-900",
    nextAction: { label: "Picked up", status: OrderStatus.DELIVERED },
  },
];

const REFRESH_MS = 5_000;

export function KitchenOrderBoard({ grouped, thresholds }: KitchenOrderBoardProps) {
  const router = useRouter();

  const activeOrders = useMemo(
    () => [
      ...grouped.NEW,
      ...grouped.PROCESSING,
      ...grouped.PACKING,
      ...grouped.READY,
    ],
    [grouped]
  );

  useKitchenChime(activeOrders);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const activeTotal = activeOrders.length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {activeTotal} active today · tap lines when done · updated orders bump to top · refreshes
        every {REFRESH_MS / 1000}s
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const orders = sortKitchenBoardOrders(grouped[column.status] ?? []);
          return (
            <section
              key={column.status}
              className={`flex min-h-[120px] flex-col rounded-lg border p-3 ${column.sectionClass}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-servora-charcoal">
                  {column.title}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${column.countClass}`}
                >
                  {orders.length}
                </span>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-2">
                {orders.length === 0 ? (
                  <p className="col-span-full py-6 text-center text-xs text-gray-500">
                    No orders
                  </p>
                ) : (
                  orders.map((order) => (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      accent={column.accent}
                      nextAction={
                        getKitchenNextAction(order.status, order.channel) ??
                        column.nextAction
                      }
                      thresholds={thresholds}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
