"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createQuickRawMaterial } from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DEFAULT_UNIT, UNITS } from "@/lib/units";

type RawMaterialOption = {
  id: string;
  name: string;
  sku: string;
  category: string;
  defaultUnit: string;
  aliases: string | null;
  isActive: boolean;
};

type RawMaterialRow = {
  rawMaterialId: string;
  quantityRequired: string;
  unit: string;
};

type PrepFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  ingredients: RawMaterialOption[];
  initialData?: {
    name: string;
    description: string | null;
    category: string;
    yieldQuantity: number;
    yieldUnit: string;
    inclusionOutputQuantity?: number | null;
    instructions: string | null;
    ingredients: { ingredientId: string; quantityRequired: number; unit: string }[];
  };
  categories?: string[];
  submitLabel?: string;
};

export function PrepForm({
  action,
  ingredients: initialIngredients,
  initialData,
  categories = [],
  submitLabel = "Save prep item",
}: PrepFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddingIngredient, startAddingIngredient] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [rawMaterialsCatalog, setRawMaterialsCatalog] = useState(initialIngredients);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [rawMaterials, setRawMaterials] = useState<RawMaterialRow[]>(
    initialData?.ingredients.map((ing) => ({
      rawMaterialId: ing.ingredientId,
      quantityRequired: String(ing.quantityRequired),
      unit: ing.unit,
    })) ?? []
  );

  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));
  const selectedRawMaterialIds = useMemo(
    () => new Set(rawMaterials.map((r) => r.rawMaterialId)),
    [rawMaterials]
  );

  const filteredIngredients = useMemo(() => {
    const search = ingredientSearch.trim().toLowerCase();
    if (!search) return rawMaterialsCatalog.slice(0, 20);
    return rawMaterialsCatalog
      .filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.sku.toLowerCase().includes(search) ||
          i.category.toLowerCase().includes(search)
      )
      .slice(0, 24);
  }, [ingredientSearch, rawMaterialsCatalog]);

  function addRawMaterial(rawMaterial: RawMaterialOption) {
    if (selectedRawMaterialIds.has(rawMaterial.id)) return;
    setRawMaterials((c) => [
      ...c,
      { rawMaterialId: rawMaterial.id, quantityRequired: "", unit: rawMaterial.defaultUnit },
    ]);
    setIngredientSearch("");
  }

  function handleSubmit(formData: FormData) {
    if (rawMaterials.length === 0) {
      setBuilderError("Add at least one raw material to the prep recipe.");
      return;
    }
    const missingQty = rawMaterials.some(
      (ing) => !ing.quantityRequired || Number(ing.quantityRequired) <= 0
    );
    if (missingQty) {
      setBuilderError("Every raw material needs a quantity greater than 0.");
      return;
    }

    formData.set("ingredientCount", String(rawMaterials.length));
    rawMaterials.forEach((ing, i) => {
      formData.set(`ingredient_${i}_ingredientId`, ing.rawMaterialId);
      formData.set(`ingredient_${i}_quantityRequired`, ing.quantityRequired);
      formData.set(`ingredient_${i}_unit`, ing.unit);
    });
    setBuilderError("");

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) setErrors(result.error as Record<string, string[]>);
      else {
        router.push("/prep");
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-6">
      <p className="form-hint rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2 text-sm text-teal-900">
        Prep items are made in batches (garam masala, bases). Output goes to inventory — use it in
        dish BOMs. Not sold on POS.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Prep name *"
          defaultValue={initialData?.name}
          error={errors.name?.[0]}
          required
        />
        <CategoryCombobox
          name="category"
          label="Category"
          categories={categories}
          defaultValue={initialData?.category ?? "Prep"}
          error={errors.category?.[0]}
          required
        />
        <Input
          name="yieldQuantity"
          label="Standard batch yield *"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={initialData?.yieldQuantity ?? 1}
          error={errors.yieldQuantity?.[0]}
          hint="Recipe makes this much per batch (e.g. 500)"
          required
        />
        <Select
          name="yieldUnit"
          label="Yield unit *"
          defaultValue={initialData?.yieldUnit ?? DEFAULT_UNIT}
          options={unitOptions}
          error={errors.yieldUnit?.[0]}
          required
        />
        <Input
          name="inclusionOutputQuantity"
          label="Per inclusion serving"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={
            initialData?.inclusionOutputQuantity != null
              ? String(initialData.inclusionOutputQuantity)
              : ""
          }
          error={errors.inclusionOutputQuantity?.[0]}
          hint="Prep output used when this batch is a free side on another dish (e.g. 50 GM raita)"
        />
      </div>

      <Textarea
        name="description"
        label="Notes"
        rows={2}
        defaultValue={initialData?.description ?? ""}
      />
      <Textarea
        name="instructions"
        label="Method"
        rows={3}
        defaultValue={initialData?.instructions ?? ""}
      />

      <div>
        <h3 className="mb-2 text-sm font-medium text-servora-charcoal">Input raw materials *</h3>
        {(errors.ingredients || builderError) && (
          <p className="mb-2 text-xs text-servora-red">
            {builderError || errors.ingredients?.[0]}
          </p>
        )}
        <div className="card-padded mb-3">
          <input
            value={ingredientSearch}
            onChange={(e) => setIngredientSearch(e.target.value)}
            placeholder="Search raw materials…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {filteredIngredients.map((ing) => (
              <button
                key={ing.id}
                type="button"
                onClick={() => addRawMaterial(ing)}
                className="flex w-full justify-between rounded border border-gray-100 px-2 py-1.5 text-left text-sm hover:bg-gray-50"
              >
                <span>{ing.name}</span>
                <span className="text-xs text-gray-500">{selectedRawMaterialIds.has(ing.id) ? "Added" : "Add"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="table-panel">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Material
                </th>
                <th className="w-28 px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Qty
                </th>
                <th className="w-24 px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Unit
                </th>
                <th className="w-20 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rawMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    Add raw materials for this batch recipe.
                  </td>
                </tr>
              ) : (
                rawMaterials.map((row, index) => {
                  const ing = rawMaterialsCatalog.find((i) => i.id === row.rawMaterialId);
                  return (
                    <tr key={row.rawMaterialId}>
                      <td className="px-4 py-2 text-sm font-medium">{ing?.name ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={row.quantityRequired}
                          onChange={(e) => {
                            const next = [...rawMaterials];
                            next[index] = { ...next[index], quantityRequired: e.target.value };
                            setRawMaterials(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{row.unit}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2 py-1 text-xs"
                          onClick={() =>
                            setRawMaterials(rawMaterials.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
