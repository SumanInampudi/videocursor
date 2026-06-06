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
import { PageHeader } from "@/components/ui/PageHeader";

type SearchParams = Promise<{
  search?: string;
  category?: string;
  lowStock?: string;
}>;

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = await searchParams;
  const [items, categories, summary] = await Promise.all([
    getInventoryItems({
      search: filters.search,
      category: filters.category,
      lowStockOnly: filters.lowStock === "true",
    }),
    getInventoryCategories(),
    getInventorySummary(),
  ]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Manage stock — quantities, locations, suppliers, cost layers, and wastage"
        actions={
          <>
            <Link href="/inventory/receive">
              <Button>Receive / Restock</Button>
            </Link>
          </>
        }
      />

      <InventorySummary summary={summary} />

      <Suspense fallback={null}>
        <InventoryFilters categories={categories} />
      </Suspense>

      <InventoryTable items={items} />
    </div>
  );
}
