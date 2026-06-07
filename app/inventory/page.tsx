import { Suspense } from "react";
import {
  getInventoryItems,
  getInventorySummary,
} from "@/app/actions/inventory";
import { InventoryView } from "@/components/inventory/InventoryView";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [items, summary] = await Promise.all([
    getInventoryItems(),
    getInventorySummary(),
  ]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand — quantities, locations, costs, and reorder levels"
      />

      <Suspense fallback={null}>
        <InventoryView items={items} summary={summary} />
      </Suspense>
    </div>
  );
}
