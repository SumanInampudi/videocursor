"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { UNITS } from "@/lib/units";
import { Unit } from "@prisma/client";

type InventoryFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  initialData?: {
    name: string;
    sku: string;
    category: string;
    description: string | null;
    notes: string | null;
    quantity: number;
    unit: Unit;
    reorderLevel: number;
    costPerUnit: number;
    supplier: string | null;
    storageLocation: string | null;
    expiryDate: Date | null;
    batchNumber: string | null;
    isActive: boolean;
  };
  submitLabel?: string;
};

export function InventoryForm({ action, initialData, submitLabel = "Save Item" }: InventoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(formData: FormData) {
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

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Name *"
          defaultValue={initialData?.name}
          error={errors.name?.[0]}
          required
        />
        <Input
          name="sku"
          label="SKU *"
          defaultValue={initialData?.sku}
          error={errors.sku?.[0]}
          required
        />
        <Input
          name="category"
          label="Category *"
          defaultValue={initialData?.category}
          error={errors.category?.[0]}
          placeholder="e.g. Dry Goods, Dairy, Meat"
          required
        />
        <Select
          name="unit"
          label="Unit *"
          defaultValue={initialData?.unit}
          options={unitOptions}
          error={errors.unit?.[0]}
          required
        />
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
        <Input
          name="supplier"
          label="Supplier"
          defaultValue={initialData?.supplier ?? ""}
          error={errors.supplier?.[0]}
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
