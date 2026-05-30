"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { UNITS } from "@/lib/units";
import { InventoryItem } from "@prisma/client";

type IngredientRow = {
  inventoryItemId: string;
  quantityRequired: string;
  unit: string;
};

type RecipeFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  inventoryItems: InventoryItem[];
  initialData?: {
    name: string;
    description: string | null;
    category: string;
    yieldQuantity: number;
    yieldUnit: string;
    instructions: string | null;
    ingredients: {
      inventoryItemId: string;
      quantityRequired: number;
      unit: string;
    }[];
  };
  submitLabel?: string;
};

export function RecipeForm({
  action,
  inventoryItems,
  initialData,
  submitLabel = "Save Recipe",
}: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData?.ingredients.map((ing) => ({
      inventoryItemId: ing.inventoryItemId,
      quantityRequired: String(ing.quantityRequired),
      unit: ing.unit,
    })) ?? [{ inventoryItemId: "", quantityRequired: "", unit: "g" }]
  );

  const inventoryOptions = inventoryItems.map((item) => ({
    value: item.id,
    label: `${item.name} (${Number(item.quantity)} ${item.unit} available)`,
  }));

  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  function addIngredient() {
    setIngredients([...ingredients, { inventoryItemId: "", quantityRequired: "", unit: "g" }]);
  }

  function removeIngredient(index: number) {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof IngredientRow, value: string) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "inventoryItemId") {
      const item = inventoryItems.find((i) => i.id === value);
      if (item) updated[index].unit = item.unit;
    }

    setIngredients(updated);
  }

  function handleSubmit(formData: FormData) {
    formData.set("ingredientCount", String(ingredients.length));
    ingredients.forEach((ing, i) => {
      formData.set(`ingredient_${i}_inventoryItemId`, ing.inventoryItemId);
      formData.set(`ingredient_${i}_quantityRequired`, ing.quantityRequired);
      formData.set(`ingredient_${i}_unit`, ing.unit);
    });

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
      } else {
        router.push("/recipes");
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Recipe Name *"
          defaultValue={initialData?.name}
          error={errors.name?.[0]}
          required
        />
        <Input
          name="category"
          label="Category *"
          defaultValue={initialData?.category}
          error={errors.category?.[0]}
          placeholder="e.g. Pizza, Curry, Appetizer"
          required
        />
        <Input
          name="yieldQuantity"
          label="Yield Quantity *"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={initialData?.yieldQuantity}
          error={errors.yieldQuantity?.[0]}
          required
        />
        <Input
          name="yieldUnit"
          label="Yield Unit *"
          defaultValue={initialData?.yieldUnit}
          error={errors.yieldUnit?.[0]}
          placeholder="e.g. pizza, portions, servings"
          required
        />
      </div>

      <Textarea
        name="description"
        label="Description"
        rows={2}
        defaultValue={initialData?.description ?? ""}
        error={errors.description?.[0]}
      />

      <Textarea
        name="instructions"
        label="Instructions"
        rows={3}
        defaultValue={initialData?.instructions ?? ""}
        error={errors.instructions?.[0]}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-servora-charcoal">Ingredients (BOM) *</h3>
          <Button type="button" variant="secondary" onClick={addIngredient} className="text-xs">
            + Add Ingredient
          </Button>
        </div>

        {errors.ingredients && (
          <p className="mb-2 text-xs text-servora-red">{errors.ingredients[0]}</p>
        )}

        <div className="space-y-3">
          {ingredients.map((ing, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-[1fr_120px_80px_auto]"
            >
              <Select
                label={index === 0 ? "Inventory Item" : undefined}
                value={ing.inventoryItemId}
                onChange={(e) => updateIngredient(index, "inventoryItemId", e.target.value)}
                options={inventoryOptions}
                placeholder="Select item..."
              />
              <Input
                label={index === 0 ? "Qty Required" : undefined}
                type="number"
                step="0.01"
                min="0.01"
                value={ing.quantityRequired}
                onChange={(e) => updateIngredient(index, "quantityRequired", e.target.value)}
              />
              <Select
                label={index === 0 ? "Unit" : undefined}
                value={ing.unit}
                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                options={unitOptions}
              />
              <div className={index === 0 ? "flex items-end" : "flex items-center"}>
                <Button
                  type="button"
                  variant="danger"
                  className="px-2 py-1 text-xs"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
