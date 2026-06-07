"use client";

import { useEffect, useState, useTransition } from "react";
import { createRawMaterial } from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UNITS } from "@/lib/units";

type RawMaterialAddModalProps = {
  open: boolean;
  categories: string[];
  onClose: () => void;
  onCreated: () => void;
};

export function RawMaterialAddModal({
  open,
  categories,
  onClose,
  onCreated,
}: RawMaterialAddModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("g");
  const [wastagePercent, setWastagePercent] = useState("0");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName("");
    setCategory("");
    setUnit("g");
    setWastagePercent("0");
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("category", category);
      formData.set("defaultUnit", unit);
      formData.set("wastagePercent", wastagePercent || "0");

      const result = await createRawMaterial(formData);
      if (result.error) {
        setErrors(result.error);
        return;
      }

      onCreated();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="raw-material-add-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 bg-gradient-to-br from-servora-yellow/10 to-white px-5 py-4">
          <h2 id="raw-material-add-title" className="text-lg font-bold text-servora-charcoal">
            Add raw material
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            SKU is generated automatically. A zero-stock line is created for receiving.
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name?.[0]}
            placeholder="e.g. Basmati rice"
            autoFocus
            required
          />
          <CategoryCombobox
            label="Category *"
            name="raw_material_category"
            categories={categories}
            value={category}
            onChange={setCategory}
            error={errors.category?.[0]}
            hint="Pick existing or type a new category."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Default unit *"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={UNITS.map((u) => ({ value: u, label: u }))}
              error={errors.defaultUnit?.[0]}
            />
            <Input
              label="Expected wastage %"
              type="number"
              min={0}
              max={99}
              step={0.1}
              value={wastagePercent}
              onChange={(e) => setWastagePercent(e.target.value)}
              error={errors.wastagePercent?.[0]}
              hint="Trim, spillage — affects usable qty & cost"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !name.trim() || !category.trim()}>
            {isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>
    </div>
  );
}
