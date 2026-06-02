import { getKdsThresholds } from "@/app/actions/kds";
import { getOrdersByStatus } from "@/app/actions/orders";
import { KitchenOrderBoard } from "@/components/orders/KitchenOrderBoard";
import { filterKitchenLines } from "@/lib/recipe-fulfillment";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type KitchenOrder = Awaited<ReturnType<typeof getOrdersByStatus>>["NEW"][number];

function filterForKitchenBoard(orders: KitchenOrder[]) {
  return orders
    .map((order) => ({
      ...order,
      lineItems: filterKitchenLines(order.lineItems),
    }))
    .filter((order) => order.lineItems.length > 0);
}

export default async function KitchenPage() {
  const [grouped, thresholds] = await Promise.all([getOrdersByStatus(), getKdsThresholds()]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isActiveToday = (createdAt: Date) => new Date(createdAt) >= todayStart;

  const filterActive = (orders: KitchenOrder[]) =>
    filterForKitchenBoard(orders.filter((o) => isActiveToday(o.createdAt)));

  return (
    <KitchenOrderBoard
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
