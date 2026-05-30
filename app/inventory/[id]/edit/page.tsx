import { notFound } from "next/navigation";
import { getInventoryItem, updateInventoryItem } from "@/app/actions/inventory";
import { InventoryForm } from "@/components/inventory/InventoryForm";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function EditInventoryPage({ params }: Props) {
  const item = await getInventoryItem(params.id);

  if (!item) notFound();

  const updateAction = updateInventoryItem.bind(null, params.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Edit Inventory Item</h1>
        <p className="text-sm text-gray-500">Update stock details for {item.name}</p>
      </div>
      <InventoryForm
        action={updateAction}
        initialData={{
          name: item.name,
          sku: item.sku,
          category: item.category,
          description: item.description,
          notes: item.notes,
          quantity: Number(item.quantity),
          unit: item.unit,
          reorderLevel: Number(item.reorderLevel),
          costPerUnit: Number(item.costPerUnit),
          supplier: item.supplier,
          storageLocation: item.storageLocation,
          expiryDate: item.expiryDate,
          batchNumber: item.batchNumber,
          isActive: item.isActive,
        }}
        submitLabel="Update Item"
      />
    </div>
  );
}
