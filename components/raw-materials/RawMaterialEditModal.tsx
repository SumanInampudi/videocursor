"use client";

import { useEffect, useState, useTransition } from "react";
import { updateRawMaterial } from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UNITS } from "@/lib/units";
import { Ingredient } from "@prisma/client";

type RawMaterialEditModalProps = {
  open: boolean;
  ingredient: Ingredient | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
};

export function RawMaterialEditModal({
  open,
  ingredient,
  categories,
  onClose,
  onSaved,
}: RawMaterialEditModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
  }, [open, ingredient?.id]);

  if (!open || !ingredient) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateRawMaterial(ingredient.id, formData);
      if (result.error) {
        setErrors(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="raw-material-edit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="raw-material-edit-title" className="text-lg font-bold text-servora-charcoal">
            Edit raw material
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">{ingredient.name}</p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Input
            name="name"
            label="Name *"
            defaultValue={ingredient.name}
            error={errors.name?.[0]}
            required
          />
          <Input
            name="sku"
            label="SKU"
            defaultValue={ingredient.sku}
            error={errors.sku?.[0]}
            hint="Leave as-is unless you need a custom code."
          />
          <CategoryCombobox
            name="category"
            label="Category *"
            categories={categories}
            defaultValue={ingredient.category}
            error={errors.category?.[0]}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              name="defaultUnit"
              label="Unit *"
              defaultValue={ingredient.defaultUnit}
              options={unitOptions}
              error={errors.defaultUnit?.[0]}
              required
            />
            <Input
              name="wastagePercent"
              label="Wastage %"
              type="number"
              min={0}
              max={99}
              step={0.1}
              defaultValue={Number(ingredient.wastagePercent ?? 0)}
              error={errors.wastagePercent?.[0]}
            />
          </div>
          <Input
            name="aliases"
            label="Search aliases"
            defaultValue={ingredient.aliases ?? ""}
            error={errors.aliases?.[0]}
            placeholder="Comma-separated alternate names"
          />
          <label className="flex items-center gap-2 text-sm text-servora-charcoal">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={ingredient.isActive}
              className="h-4 w-4 rounded border-gray-300 text-servora-yellow focus:ring-servora-yellow"
            />
            Active
          </label>
          <input type="hidden" name="notes" value={ingredient.notes ?? ""} />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
