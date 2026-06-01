"use client";

import { useMemo, useState } from "react";
import { OrderBoard } from "@/components/orders/OrderBoard";
import { Input } from "@/components/ui/Input";
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

type OrderBoardWithFiltersProps = {
  grouped: Record<OrderStatus, OrderWithLines[]>;
};

export function OrderBoardWithFilters({ grouped }: OrderBoardWithFiltersProps) {
  const [search, setSearch] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [hideOldDelivered, setHideOldDelivered] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const deliveredCutoff = new Date();
    deliveredCutoff.setDate(deliveredCutoff.getDate() - 7);

    const result = {} as Record<OrderStatus, OrderWithLines[]>;

    for (const status of Object.keys(grouped) as OrderStatus[]) {
      result[status] = (grouped[status] ?? []).filter((order) => {
        if (q) {
          const hay = `${order.orderNumber} ${order.customerName ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (todayOnly) {
          const created = new Date(order.createdAt);
          if (created < todayStart) return false;
        }
        if (
          hideOldDelivered &&
          status === OrderStatus.DELIVERED &&
          new Date(order.createdAt) < deliveredCutoff
        ) {
          return false;
        }
        return true;
      });
    }

    return result;
  }, [grouped, search, todayOnly, hideOldDelivered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            placeholder="Order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={todayOnly}
            onChange={(e) => setTodayOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Today only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={hideOldDelivered}
            onChange={(e) => setHideOldDelivered(e.target.checked)}
            className="rounded border-gray-300"
          />
          Hide delivered &gt; 7 days
        </label>
      </div>
      <OrderBoard grouped={filtered} />
    </div>
  );
}
