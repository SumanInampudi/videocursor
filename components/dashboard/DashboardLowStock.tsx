import Link from "next/link";
import { formatQuantity } from "@/lib/units";

type LowStockItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
};

export function DashboardLowStock({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        All active SKUs are above reorder level.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-900">
          Low stock ({items.length})
        </h3>
        <Link
          href="/inventory?lowStock=true"
          className="text-xs font-medium link-brand"
        >
          View all →
        </Link>
      </div>
      <ul className="space-y-1 text-sm text-amber-950">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <Link href={`/inventory/${item.id}/edit`} className="hover:underline">
              {item.name}
            </Link>
            <span className="shrink-0 text-xs">
              {formatQuantity(item.quantity, item.unit)} / reorder{" "}
              {formatQuantity(item.reorderLevel, item.unit)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
