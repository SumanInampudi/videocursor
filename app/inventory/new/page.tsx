import { createInventoryItem } from "@/app/actions/inventory";
import { InventoryForm } from "@/components/inventory/InventoryForm";

export default function NewInventoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Add Inventory Item</h1>
        <p className="text-sm text-gray-500">
          Capture detailed stock information for accurate recipe yield calculations
        </p>
      </div>
      <InventoryForm action={createInventoryItem} submitLabel="Add Item" />
    </div>
  );
}
