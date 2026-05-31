import Link from "next/link";
import { createInventoryPurchase, getInventoryItemsForPurchase } from "@/app/actions/purchases";
import { PurchaseForm } from "@/components/inventory/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const items = await getInventoryItemsForPurchase();

  return (
    <div>
      <Link href="/inventory" className="text-sm text-servora-yellow hover:underline">
        ← Inventory
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Record stock purchase</h1>
      <p className="mb-6 text-sm text-gray-500">
        Log what you bought from suppliers. Choose <strong>paid</strong> or{" "}
        <strong>credit</strong> so you can track how much you still owe.
      </p>
      <PurchaseForm action={createInventoryPurchase} items={items} />
    </div>
  );
}
