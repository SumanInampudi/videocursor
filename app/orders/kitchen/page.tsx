import Link from "next/link";
import { getOrdersByStatus } from "@/app/actions/orders";
import { KitchenBoard } from "@/components/orders/KitchenBoard";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const grouped = await getOrdersByStatus();
  const ready = grouped.READY ?? [];
  const processing = grouped.PROCESSING ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-servora-yellow hover:underline">
            ← Orders
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-servora-charcoal">Kitchen display</h1>
          <p className="text-sm text-gray-500">
            Large view for ready & processing orders · auto-refreshes every 30s
          </p>
        </div>
        <Link href="/orders/new">
          <Button>New order</Button>
        </Link>
      </div>
      <KitchenBoard ready={ready} processing={processing} />
    </div>
  );
}
