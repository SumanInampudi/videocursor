"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { InventorySupplierFields } from "@/components/inventory/InventorySupplierFields";
import { UNITS } from "@/lib/units";
import { Unit } from "@prisma/client";

type SupplierOption = { id: string; name: string };

type RawMaterialOption = {
  id: string;
  name: string;
  sku: string;
  category: string;
  defaultUnit: Unit;
};

type InventoryFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  initialData?: {
    ingredientId: string | null;
    name: string;
    sku: string;
    category: string;
    imageUrl?: string | null;
    description: string | null;
    notes: string | null;
    quantity: number;
    unit: Unit;
    reorderLevel: number;
    costPerUnit: number;
    supplierId?: string | null;
    supplier: string | null;
    storageLocation: string | null;
    expiryDate: Date | null;
    batchNumber: string | null;
    isActive: boolean;
  };
  ingredients?: RawMaterialOption[];
  suppliers?: SupplierOption[];
  categories?: string[];
  submitLabel?: string;
};

export function InventoryForm({
  action,
  initialData,
  ingredients = [],
  suppliers = [],
  categories = [],
  submitLabel = "Save Item",
}: InventoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState(initialData?.ingredientId ?? "");
  const [catalogValues, setCatalogValues] = useState({
    name: initialData?.name ?? "",
    sku: initialData?.sku ?? "",
    category: initialData?.category ?? "",
    unit: initialData?.unit ?? Unit.g,
  });

  const selectedRawMaterial = ingredients.find(
    (rawMaterial) => rawMaterial.id === selectedRawMaterialId
  );

  function handleSubmit(formData: FormData) {
    if (selectedRawMaterial) {
      formData.set("name", selectedRawMaterial.name);
      formData.set("sku", selectedRawMaterial.sku);
      formData.set("category", selectedRawMaterial.category);
      formData.set("unit", selectedRawMaterial.defaultUnit);
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
      } else {
        router.push("/inventory");
        router.refresh();
      }
    });
  }

  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));
  const rawMaterialOptions = ingredients.map((rawMaterial) => ({
    value: rawMaterial.id,
    label: `${rawMaterial.name} (${rawMaterial.sku})`,
  }));

  function handleRawMaterialChange(rawMaterialId: string) {
    setSelectedRawMaterialId(rawMaterialId);
    const rawMaterial = ingredients.find((item) => item.id === rawMaterialId);

    if (!rawMaterial) return;

    setCatalogValues({
      name: rawMaterial.name,
      sku: rawMaterial.sku,
      category: rawMaterial.category,
      unit: rawMaterial.defaultUnit,
    });
  }

  function updateCatalogValue(field: keyof typeof catalogValues, value: string) {
    setCatalogValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="ingredientId"
          label="Master Raw Material"
          value={selectedRawMaterialId}
          onChange={(event) => handleRawMaterialChange(event.target.value)}
          options={rawMaterialOptions}
          placeholder="Link to raw material catalog..."
          error={errors.ingredientId?.[0]}
        />
        <Input
          name="name"
          label="Name *"
          value={catalogValues.name}
          onChange={(event) => updateCatalogValue("name", event.target.value)}
          error={errors.name?.[0]}
          readOnly={Boolean(selectedRawMaterial)}
          className={selectedRawMaterial ? "bg-gray-50" : ""}
          required
        />
        <Input
          name="sku"
          label="SKU *"
          value={catalogValues.sku}
          onChange={(event) => updateCatalogValue("sku", event.target.value)}
          error={errors.sku?.[0]}
          readOnly={Boolean(selectedRawMaterial)}
          className={selectedRawMaterial ? "bg-gray-50" : ""}
          required
        />
        <CategoryCombobox
          name="category"
          label="Category"
          categories={categories}
          value={catalogValues.category}
          onChange={(value) => updateCatalogValue("category", value)}
          error={errors.category?.[0]}
          placeholder="e.g. Dry Goods, Dairy, Meat"
          readOnly={Boolean(selectedRawMaterial)}
          required
        />
        <Select
          name="unit"
          label="Unit *"
          value={catalogValues.unit}
          onChange={(event) => updateCatalogValue("unit", event.target.value)}
          options={unitOptions}
          error={errors.unit?.[0]}
          disabled={Boolean(selectedRawMaterial)}
          required
        />
        {selectedRawMaterial && (
          <input type="hidden" name="unit" value={selectedRawMaterial.defaultUnit} />
        )}
        <Input
          name="quantity"
          label="Quantity on Hand *"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initialData?.quantity}
          error={errors.quantity?.[0]}
          required
        />
        <Input
          name="reorderLevel"
          label="Reorder Level *"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initialData?.reorderLevel}
          error={errors.reorderLevel?.[0]}
          required
        />
        <Input
          name="costPerUnit"
          label="Cost per Unit ($) *"
          type="number"
          step="0.0001"
          min="0"
          defaultValue={initialData?.costPerUnit}
          error={errors.costPerUnit?.[0]}
          required
        />
        <InventorySupplierFields
          suppliers={suppliers}
          defaultSupplierId={initialData?.supplierId}
          defaultSupplierText={initialData?.supplier}
          errors={errors}
        />
        <Input
          name="storageLocation"
          label="Storage Location"
          defaultValue={initialData?.storageLocation ?? ""}
          error={errors.storageLocation?.[0]}
        />
        <Input
          name="expiryDate"
          label="Expiry Date"
          type="date"
          defaultValue={
            initialData?.expiryDate
              ? new Date(initialData.expiryDate).toISOString().split("T")[0]
              : ""
          }
          error={errors.expiryDate?.[0]}
        />
        <Input
          name="batchNumber"
          label="Batch / Lot Number"
          defaultValue={initialData?.batchNumber ?? ""}
          error={errors.batchNumber?.[0]}
        />
      </div>

      <Textarea
        name="imageUrl"
        label="Image URL"
        rows={2}
        defaultValue={initialData?.imageUrl ?? ""}
        error={errors.imageUrl?.[0]}
        placeholder="https://... or /uploads/inventory/item.jpg"
      />

      <Textarea
        name="description"
        label="Description"
        rows={3}
        defaultValue={initialData?.description ?? ""}
        error={errors.description?.[0]}
      />

      <Textarea
        name="notes"
        label="Notes"
        rows={2}
        defaultValue={initialData?.notes ?? ""}
        error={errors.notes?.[0]}
      />

      <label className="flex items-center gap-2 text-sm text-servora-charcoal">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initialData?.isActive ?? true}
          className="h-4 w-4 rounded border-gray-300 text-servora-yellow focus:ring-servora-yellow"
        />
        Active (available for recipes)
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
