"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTimeIST } from "@/lib/format";

type KitchenOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  createdAt: Date;
  lineItems: {
    quantity: number;
    recipeName: string;
    recipe: { name: string } | null;
  }[];
};

export function KitchenBoard({
  ready,
  processing,
}: {
  ready: KitchenOrder[];
  processing: KitchenOrder[];
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
        <h2 className="mb-4 text-xl font-bold text-amber-900">
          Processing ({processing.length})
        </h2>
        <OrderList orders={processing} />
      </section>
      <section className="rounded-xl border-2 border-green-400 bg-green-50 p-6">
        <h2 className="mb-4 text-xl font-bold text-green-900">
          Ready for pickup ({ready.length})
        </h2>
        <OrderList orders={ready} highlight />
      </section>
    </div>
  );
}

function OrderList({
  orders,
  highlight,
}: {
  orders: KitchenOrder[];
  highlight?: boolean;
}) {
  if (orders.length === 0) {
    return <p className="text-sm text-gray-500">None</p>;
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li
          key={order.id}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            highlight ? "border-green-300 ring-2 ring-green-200" : "border-amber-200"
          }`}
        >
          <Link
            href={`/orders/${order.id}`}
            className="text-2xl font-bold text-servora-charcoal hover:text-servora-yellow"
          >
            {order.orderNumber}
          </Link>
          {order.customerName && (
            <p className="text-lg text-gray-600">{order.customerName}</p>
          )}
          <ul className="mt-2 space-y-1 text-lg">
            {order.lineItems.map((line, i) => (
              <li key={i}>
                <strong>{line.quantity}×</strong> {line.recipe?.name ?? line.recipeName}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">{formatDateTimeIST(order.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
