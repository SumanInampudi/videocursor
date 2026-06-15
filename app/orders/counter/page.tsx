import { getKdsThresholds } from "@/app/actions/kds";
import { getOrdersByStatus } from "@/app/actions/orders";
import { CounterOrderBoard } from "@/components/orders/CounterOrderBoard";
import {
  filterRetailLines,
  orderHasKitchenLines,
} from "@/lib/product-fulfillment";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type BoardOrder = Awaited<ReturnType<typeof getOrdersByStatus>>["NEW"][number];

function filterForCounterBoard(orders: BoardOrder[]) {
  return orders
    .map((order) => ({
      ...order,
      lineItems: filterRetailLines(order.lineItems),
      retailOnly: !orderHasKitchenLines(order.lineItems),
    }))
    .filter((order) => order.lineItems.length > 0);
}

export default async function CounterPage() {
  const [grouped, thresholds] = await Promise.all([getOrdersByStatus(), getKdsThresholds()]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isActiveToday = (createdAt: Date) => new Date(createdAt) >= todayStart;

  const filterActive = (orders: BoardOrder[]) =>
    filterForCounterBoard(orders.filter((o) => isActiveToday(o.createdAt)));

  return (
    <CounterOrderBoard
      thresholds={thresholds}
      grouped={{
        NEW: filterActive(grouped[OrderStatus.NEW] ?? []),
        PROCESSING: filterActive(grouped[OrderStatus.PROCESSING] ?? []),
        PACKING: filterActive(grouped[OrderStatus.PACKING] ?? []),
        READY: filterActive(grouped[OrderStatus.READY] ?? []),
      }}
    />
  );
}
