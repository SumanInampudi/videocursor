"use client";

import { OrderCard } from "@/components/orders/OrderCard";
import { OrderStatus } from "@prisma/client";

type OrderWithLines = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: OrderStatus;
  createdAt: Date;
  lineItems: {
    id: string;
    quantity: number;
    unitSalePrice: { toString(): string };
    recipeName: string;
    recipe: { name: string; yieldUnit: string } | null;
  }[];
};

type OrderBoardProps = {
  grouped: Record<OrderStatus, OrderWithLines[]>;
};

const COLUMNS: {
  status: OrderStatus;
  title: string;
  nextAction?: { label: string; status: OrderStatus };
}[] = [
  { status: OrderStatus.NEW, title: "New", nextAction: { label: "Start", status: OrderStatus.PROCESSING } },
  {
    status: OrderStatus.PROCESSING,
    title: "Processing",
    nextAction: { label: "Ready", status: OrderStatus.READY },
  },
  {
    status: OrderStatus.READY,
    title: "Ready",
    nextAction: { label: "Delivered", status: OrderStatus.DELIVERED },
  },
  { status: OrderStatus.DELIVERED, title: "Delivered" },
];

export function OrderBoard({ grouped }: OrderBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4">
      {COLUMNS.map((column) => {
        const orders = grouped[column.status] ?? [];
        return (
          <section
            key={column.status}
            className="min-w-[min(100%,280px)] shrink-0 snap-start md:min-w-0"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {column.title}
              </h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {orders.length}
              </span>
            </div>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  No orders
                </p>
              ) : (
                orders.map((order) => (
                  <OrderCard key={order.id} order={order} nextAction={column.nextAction} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
