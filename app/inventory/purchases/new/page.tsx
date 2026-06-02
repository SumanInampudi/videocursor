import Link from "next/link";
import { getSupplierOptions } from "@/app/actions/suppliers";
import { createInventoryPurchase, getInventoryItemsForPurchase } from "@/app/actions/purchases";
import { PurchaseForm } from "@/components/inventory/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [items, suppliers] = await Promise.all([
    getInventoryItemsForPurchase(),
    getSupplierOptions(),
  ]);

  return (
    <div>
      <Link href="/inventory" className="link-brand text-sm">
        ← Inventory
      </Link>
      <h1 className="mt-2 page-title">Record stock purchase</h1>
      <p className="mb-6 text-sm text-gray-500">
        Log what you bought from suppliers. Choose <strong>paid</strong> or{" "}
        <strong>credit</strong> so you can track how much you still owe.
      </p>
      <PurchaseForm action={createInventoryPurchase} items={items} suppliers={suppliers} />
    </div>
  );
}
