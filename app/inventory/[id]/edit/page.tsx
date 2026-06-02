import { getSupplierOptions } from "@/app/actions/suppliers";
import { getActiveIngredientsForRecipes } from "@/app/actions/recipes";
import { notFound } from "next/navigation";
import { getInventoryItem, updateInventoryItem } from "@/app/actions/inventory";
import { CostHistoryPanel } from "@/components/inventory/CostHistoryPanel";
import { InventoryForm } from "@/components/inventory/InventoryForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditInventoryPage({ params }: Props) {
  const { id } = await params;
  const [item, ingredients, suppliers] = await Promise.all([
    getInventoryItem(id),
    getActiveIngredientsForRecipes(),
    getSupplierOptions(),
  ]);

  if (!item) notFound();

  const updateAction = updateInventoryItem.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Edit Inventory Item</h1>
        <p className="text-sm text-gray-500">
          Update stock details for {item.name}. Quantity or cost changes are logged in{" "}
          <a href="/inventory/receive/history" className="link-brand">
            Stock history
          </a>
          .
        </p>
      </div>
      <InventoryForm
        action={updateAction}
        ingredients={ingredients}
        suppliers={suppliers}
        initialData={{
          ingredientId: item.ingredientId,
          name: item.name,
          sku: item.sku,
          category: item.category,
          description: item.description,
          notes: item.notes,
          quantity: Number(item.quantity),
          unit: item.unit,
          reorderLevel: Number(item.reorderLevel),
          costPerUnit: Number(item.costPerUnit),
          supplierId: item.supplierId,
          supplier: item.supplier,
          storageLocation: item.storageLocation,
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber,
          isActive: item.isActive,
        }}
        submitLabel="Update Item"
      />
      <CostHistoryPanel inventoryItemId={id} />
    </div>
  );
}
