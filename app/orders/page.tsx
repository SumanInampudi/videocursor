import Link from "next/link";
import { getOrderDashboardStats, getOrdersByStatus } from "@/app/actions/orders";
import { OrderBoard } from "@/components/orders/OrderBoard";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [grouped, stats] = await Promise.all([
    getOrdersByStatus(),
    getOrderDashboardStats(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Orders</h1>
          <p className="text-sm text-gray-500">
            Track orders from new through processing, ready, and delivered
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders/costing">
            <Button variant="secondary">How costing works</Button>
          </Link>
          <Link href="/orders/new">
            <Button>Place order</Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New" value={stats.newCount} />
        <Stat label="Processing" value={stats.processingCount} />
        <Stat label="Ready" value={stats.readyCount} />
        <Stat label="Delivered today" value={stats.deliveredToday} />
      </div>

      <OrderBoard grouped={grouped} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-servora-charcoal">{value}</p>
    </div>
  );
}
