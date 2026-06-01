import { getOrdersByStatus } from "@/app/actions/orders";
import { KitchenOrderBoard } from "@/components/orders/KitchenOrderBoard";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const grouped = await getOrdersByStatus();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isActiveToday = (createdAt: Date) => new Date(createdAt) >= todayStart;

  const filterActive = <T extends { createdAt: Date }>(orders: T[]) =>
    orders.filter((o) => isActiveToday(o.createdAt));

  return (
    <KitchenOrderBoard
      grouped={{
        NEW: filterActive(grouped[OrderStatus.NEW] ?? []),
        PROCESSING: filterActive(grouped[OrderStatus.PROCESSING] ?? []),
        READY: filterActive(grouped[OrderStatus.READY] ?? []),
      }}
    />
  );
}
