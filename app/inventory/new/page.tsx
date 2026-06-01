import { getSupplierOptions } from "@/app/actions/suppliers";
import { getActiveIngredientsForRecipes } from "@/app/actions/recipes";
import { createInventoryItem } from "@/app/actions/inventory";
import { InventoryForm } from "@/components/inventory/InventoryForm";

export const dynamic = "force-dynamic";

export default async function NewInventoryPage() {
  const [ingredients, suppliers] = await Promise.all([
    getActiveIngredientsForRecipes(),
    getSupplierOptions(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Add Inventory Item</h1>
        <p className="text-sm text-gray-500">
          Capture detailed stock information for accurate recipe yield calculations
        </p>
      </div>
      <InventoryForm
        action={createInventoryItem}
        ingredients={ingredients}
        suppliers={suppliers}
        submitLabel="Add Item"
      />
    </div>
  );
}
