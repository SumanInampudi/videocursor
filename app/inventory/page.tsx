import Link from "next/link";
import { Suspense } from "react";
import { getInventoryCategories, getInventoryItems } from "@/app/actions/inventory";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
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
  const [items, categories] = await Promise.all([
    getInventoryItems({
      search: searchParams.search,
      category: searchParams.category,
      lowStockOnly: searchParams.lowStock === "true",
    }),
    getInventoryCategories(),
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
        <Link href="/inventory/new">
          <Button>Add Item</Button>
        </Link>
      </div>

      <Suspense fallback={null}>
        <InventoryFilters categories={categories} />
      </Suspense>

      <InventoryTable items={items} />
    </div>
  );
}
