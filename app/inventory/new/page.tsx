import { getSupplierOptions } from "@/app/actions/suppliers";
import { getActiveIngredientsForProducts } from "@/app/actions/products";
import { createInventoryItem, getInventoryCatalogCategories } from "@/app/actions/inventory";
import { InventoryForm } from "@/components/inventory/InventoryForm";

export const dynamic = "force-dynamic";

export default async function NewInventoryPage() {
  const [ingredients, suppliers, categories] = await Promise.all([
    getActiveIngredientsForProducts(),
    getSupplierOptions(),
    getInventoryCatalogCategories(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Add Inventory Item</h1>
        <p className="text-sm text-gray-500">
          Capture detailed stock information for accurate product yield calculations
        </p>
      </div>
      <InventoryForm
        action={createInventoryItem}
        ingredients={ingredients}
        suppliers={suppliers}
        categories={categories}
        submitLabel="Add Item"
      />
    </div>
  );
}
