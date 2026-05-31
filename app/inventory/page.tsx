import Link from "next/link";
import { Suspense } from "react";
import {
  getInventoryCategories,
  getInventoryItems,
  getInventorySummary,
} from "@/app/actions/inventory";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { InventorySummary } from "@/components/inventory/InventorySummary";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { Button } from "@/components/ui/Button";

type SearchParams = {
  search?: string;
  category?: string;
  lowStock?: string;
};

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [items, categories, summary] = await Promise.all([
    getInventoryItems({
      search: searchParams.search,
      category: searchParams.category,
      lowStockOnly: searchParams.lowStock === "true",
    }),
    getInventoryCategories(),
    getInventorySummary(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Inventory</h1>
          <p className="text-sm text-gray-500">
            Manage stock with granular details — quantities, locations, suppliers, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/purchases/new">
            <Button variant="secondary">Record purchase</Button>
          </Link>
          <Link href="/inventory/new">
            <Button>Add Item</Button>
          </Link>
        </div>
      </div>

      <InventorySummary summary={summary} />

      <Suspense fallback={null}>
        <InventoryFilters categories={categories} />
      </Suspense>

      <InventoryTable items={items} />
    </div>
  );
}
