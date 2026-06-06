"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateRawMaterial } from "@/app/actions/ingredients";
import { CreateStockButton } from "@/components/ingredients/CreateStockButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UNITS } from "@/lib/units";
import { Ingredient, InventoryItem } from "@prisma/client";

type RawMaterialWithInventory = Ingredient & {
  inventoryItems?: InventoryItem[];
};

export function RawMaterialTable({ ingredients }: { ingredients: RawMaterialWithInventory[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const unitOptions = UNITS.map((unit) => ({ value: unit, label: unit }));

  function startEdit(id: string) {
    setEditingId(id);
    setErrors({});
  }

  function cancelEdit() {
    setEditingId("");
    setErrors({});
  }

  function saveRawMaterial(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateRawMaterial(id, formData);
      if (result.error) {
        setErrors(result.error);
        return;
      }
      setEditingId("");
      setErrors({});
      router.refresh();
    });
  }

  if (ingredients.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-text">No raw materials yet.</p>
        <p className="mt-2 text-sm text-gray-500">
          Use Quick Add above to create your first raw material — a zero-quantity stock line is
          created automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="table-panel">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Raw Material</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">SKU</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Waste %</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stock Links</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {ingredients.map((ingredient) => {
            const isEditing = editingId === ingredient.id;
            if (isEditing) {
              return (
                <tr key={ingredient.id} className="bg-yellow-50/40 align-top">
                  <td colSpan={8} className="px-4 py-4">
                    <form action={(formData) => saveRawMaterial(ingredient.id, formData)}>
                      <div className="grid gap-3 lg:grid-cols-[1.2fr_150px_180px_100px_1fr_120px]">
                        <Input name="name" label="Name *" defaultValue={ingredient.name} error={errors.name?.[0]} required />
                        <Input name="sku" label="SKU *" defaultValue={ingredient.sku} error={errors.sku?.[0]} required />
                        <Input name="category" label="Category *" defaultValue={ingredient.category} error={errors.category?.[0]} required />
                        <Select name="defaultUnit" label="Unit *" defaultValue={ingredient.defaultUnit} options={unitOptions} error={errors.defaultUnit?.[0]} required />
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
                        <Input name="aliases" label="Aliases" defaultValue={ingredient.aliases ?? ""} error={errors.aliases?.[0]} />
                        <label className="flex items-end gap-2 pb-2 text-sm text-servora-charcoal">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={ingredient.isActive}
                            className="h-4 w-4 rounded border-gray-300 text-servora-yellow focus:ring-servora-yellow"
                          />
                          Active
                        </label>
                      </div>
                      <input type="hidden" name="notes" value={ingredient.notes ?? ""} />
                      <div className="mt-3 flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                          {isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={ingredient.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-servora-charcoal">{ingredient.name}</div>
                  {ingredient.aliases && <div className="text-xs text-gray-500">{ingredient.aliases}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{ingredient.sku}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{ingredient.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{ingredient.defaultUnit}</td>
                <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{Number(ingredient.wastagePercent ?? 0)}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{ingredient.inventoryItems?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <Badge variant={ingredient.isActive ? "success" : "default"}>
                    {ingredient.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <CreateStockButton rawMaterialId={ingredient.id} hasStock={(ingredient.inventoryItems?.length ?? 0) > 0} />
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => startEdit(ingredient.id)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

