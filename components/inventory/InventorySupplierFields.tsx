"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type SupplierOption = { id: string; name: string };

type InventorySupplierFieldsProps = {
  suppliers: SupplierOption[];
  defaultSupplierId?: string | null;
  defaultSupplierText?: string | null;
  errors?: Record<string, string[]>;
};

export function InventorySupplierFields({
  suppliers,
  defaultSupplierId,
  defaultSupplierText,
  errors,
}: InventorySupplierFieldsProps) {
  return (
    <>
      {suppliers.length > 0 ? (
        <Select
          name="supplierId"
          label="Default supplier"
          defaultValue={defaultSupplierId ?? ""}
          options={[
            { value: "", label: "— None —" },
            ...suppliers.map((s) => ({ value: s.id, label: s.name })),
          ]}
          error={errors?.supplierId?.[0]}
        />
      ) : (
        <p className="text-xs text-gray-500 sm:col-span-2">
          <a href="/suppliers/new" className="text-servora-yellow hover:underline">
            Add suppliers
          </a>{" "}
          to link stock items for purchases and payables.
        </p>
      )}
      <Input
        name="supplier"
        label="Supplier notes (optional)"
        defaultValue={defaultSupplierText ?? ""}
        error={errors?.supplier?.[0]}
        placeholder="Legacy label or extra detail"
      />
    </>
  );
}
