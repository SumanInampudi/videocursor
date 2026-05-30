"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createQuickIngredient } from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { UNITS } from "@/lib/units";

type IngredientOption = {
  id: string;
  name: string;
  sku: string;
  category: string;
  defaultUnit: string;
  aliases: string | null;
  isActive: boolean;
};

type IngredientRow = {
  ingredientId: string;
  quantityRequired: string;
  unit: string;
};

type ParsedBulkLine = {
  raw: string;
  name: string;
  quantityRequired: string;
  unit: string;
};

type RecipeFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  ingredients: IngredientOption[];
  initialData?: {
    name: string;
    description: string | null;
    category: string;
    yieldQuantity: number;
    yieldUnit: string;
    instructions: string | null;
    ingredients: {
      ingredientId: string;
      quantityRequired: number;
      unit: string;
    }[];
  };
  submitLabel?: string;
};

export function RecipeForm({
  action,
  ingredients: initialIngredients,
  initialData,
  submitLabel = "Save Recipe",
}: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddingIngredient, startAddingIngredient] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ingredientsCatalog, setIngredientsCatalog] = useState(initialIngredients);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkIssues, setBulkIssues] = useState<ParsedBulkLine[]>([]);
  const [highlightedIngredientId, setHighlightedIngredientId] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData?.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        quantityRequired: String(ing.quantityRequired),
        unit: ing.unit,
    })) ?? []
  );

  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  const selectedIngredientIds = useMemo(
    () => new Set(ingredients.map((ingredient) => ingredient.ingredientId)),
    [ingredients]
  );

  const filteredIngredients = useMemo(() => {
    const search = ingredientSearch.trim().toLowerCase();

    if (!search) return ingredientsCatalog.slice(0, 18);

    return ingredientsCatalog
      .filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(search) ||
          ingredient.sku.toLowerCase().includes(search) ||
          ingredient.category.toLowerCase().includes(search) ||
          ingredient.aliases?.toLowerCase().includes(search)
      )
      .slice(0, 24);
  }, [ingredientSearch, ingredientsCatalog]);

  const groupedIngredients = useMemo(() => {
    return filteredIngredients.reduce<Record<string, IngredientOption[]>>((groups, ingredient) => {
      groups[ingredient.category] = groups[ingredient.category] ?? [];
      groups[ingredient.category].push(ingredient);
      return groups;
    }, {});
  }, [filteredIngredients]);

  function updateIngredient(index: number, field: keyof IngredientRow, value: string) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };

    setIngredients(updated);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function flashExisting(ingredientId: string) {
    setHighlightedIngredientId(ingredientId);
    window.setTimeout(() => setHighlightedIngredientId(""), 1200);
  }

  function addIngredientToRecipe(ingredient: IngredientOption, values?: Partial<IngredientRow>) {
    setBuilderError("");

    if (selectedIngredientIds.has(ingredient.id)) {
      flashExisting(ingredient.id);
      return;
    }

    setIngredients((current) => [
      ...current,
      {
        ingredientId: ingredient.id,
        quantityRequired: values?.quantityRequired ?? "",
        unit: ingredient.defaultUnit,
      },
    ]);
    setIngredientSearch("");
  }

  function addCreatedIngredientToCatalog(ingredient: IngredientOption) {
    setIngredientsCatalog((current) => {
      const exists = current.some((item) => item.id === ingredient.id);
      if (exists) return current;
      return [...current, ingredient].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function quickAddIngredient(name: string, values?: Partial<IngredientRow>) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    startAddingIngredient(async () => {
      const result = await createQuickIngredient(trimmedName);
      if (result.ingredient) {
        const ingredient = {
          ...result.ingredient,
          aliases: null,
        } as IngredientOption;
        addCreatedIngredientToCatalog(ingredient);
        addIngredientToRecipe(ingredient, {
          ...values,
          unit: ingredient.defaultUnit,
        });
      }
    });
  }

  function normalizeUnit(unit: string) {
    return UNITS.find((candidate) => candidate.toLowerCase() === unit.toLowerCase()) ?? "g";
  }

  function parseBulkLine(raw: string): ParsedBulkLine | null {
    const line = raw.trim();
    if (!line) return null;

    const unitPattern = UNITS.join("|");
    const commaMatch = line.match(
      new RegExp(`^(.+?),\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})$`, "i")
    );
    const spaceMatch = line.match(
      new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})$`, "i")
    );
    const match = commaMatch ?? spaceMatch;

    if (!match) {
      return { raw: line, name: line, quantityRequired: "", unit: "g" };
    }

    return {
      raw: line,
      name: match[1].trim(),
      quantityRequired: match[2],
      unit: normalizeUnit(match[3]),
    };
  }

  function findCatalogMatch(name: string) {
    const search = name.trim().toLowerCase();
    return ingredientsCatalog.find(
      (ingredient) =>
        ingredient.name.toLowerCase() === search ||
        ingredient.sku.toLowerCase() === search ||
        ingredient.aliases
          ?.split(",")
          .map((alias) => alias.trim().toLowerCase())
          .includes(search)
    );
  }

  function importBulkIngredients() {
    const parsed = bulkText
      .split(/\r?\n/)
      .map(parseBulkLine)
      .filter((line): line is ParsedBulkLine => Boolean(line));

    if (parsed.length === 0) {
      setBuilderError("Paste at least one ingredient line.");
      return;
    }

    const unresolved: ParsedBulkLine[] = [];
    const handledIds = new Set(selectedIngredientIds);
    const unresolvedNames = new Set<string>();

    parsed.forEach((line) => {
      const match = findCatalogMatch(line.name);
      if (match) {
        if (handledIds.has(match.id)) {
          flashExisting(match.id);
          return;
        }

        handledIds.add(match.id);
        addIngredientToRecipe(match, {
          quantityRequired: line.quantityRequired,
          unit: match.defaultUnit,
        });
      } else if (!unresolvedNames.has(line.name.toLowerCase())) {
        unresolvedNames.add(line.name.toLowerCase());
        unresolved.push(line);
      }
    });

    setBulkIssues(unresolved);
    setBulkText(unresolved.length > 0 ? unresolved.map((line) => line.raw).join("\n") : "");
    if (unresolved.length === 0) setBuilderError("");
  }

  function createMissingBulkIngredient(line: ParsedBulkLine) {
    quickAddIngredient(line.name, {
      quantityRequired: line.quantityRequired,
    });
    setBulkIssues((current) => current.filter((item) => item.raw !== line.raw));
  }

  function handleSubmit(formData: FormData) {
    if (ingredients.length === 0) {
      setBuilderError("Add at least one ingredient to the recipe.");
      return;
    }

    const missingQty = ingredients.some((ing) => !ing.quantityRequired || Number(ing.quantityRequired) <= 0);
    if (missingQty) {
      setBuilderError("Every ingredient needs a quantity greater than 0.");
      return;
    }

    setBuilderError("");
    formData.set("ingredientCount", String(ingredients.length));
    ingredients.forEach((ing, i) => {
      formData.set(`ingredient_${i}_ingredientId`, ing.ingredientId);
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
        </div>

        {(errors.ingredients || builderError) && (
          <p className="mb-2 text-xs text-servora-red">
            {builderError || errors.ingredients?.[0]}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="text-sm font-medium text-servora-charcoal">
              Search Ingredient Master
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                placeholder="Search name, SKU, category, or alias..."
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-servora-charcoal placeholder:text-gray-400 focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!ingredientSearch.trim() || isAddingIngredient}
                onClick={() => quickAddIngredient(ingredientSearch)}
              >
                Create
              </Button>
            </div>

            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
              {Object.entries(groupedIngredients).map(([category, items]) => (
                <div key={category}>
                  <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map((ingredient) => {
                      const selected = selectedIngredientIds.has(ingredient.id);
                      return (
                        <button
                          key={ingredient.id}
                          type="button"
                          onClick={() => addIngredientToRecipe(ingredient)}
                          className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                            selected
                              ? "border-servora-yellow bg-yellow-50"
                              : "border-gray-200 bg-gray-50 hover:border-servora-yellow hover:bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-servora-charcoal">
                                {ingredient.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ingredient.sku} · {ingredient.defaultUnit}
                              </div>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-servora-yellow">
                              {selected ? "Added" : "Add"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {ingredientSearch.trim() && filteredIngredients.length === 0 && (
              <div className="mt-3 rounded-md border border-dashed border-gray-300 p-3">
                <div className="text-sm font-medium text-servora-charcoal">
                  No ingredient found
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-1 justify-start px-0 py-0 text-xs text-servora-yellow hover:bg-transparent"
                  disabled={isAddingIngredient}
                  onClick={() => quickAddIngredient(ingredientSearch)}
                >
                  Create &quot;{ingredientSearch.trim()}&quot; and add it
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label className="text-sm font-medium text-servora-charcoal">
              Bulk Paste
            </label>
            <Textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"Chicken Bone-In, 1 kg\nBasmati Rice, 500 g\nSalt, 20 g"}
              className="mt-1"
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              onClick={importBulkIngredients}
            >
              Parse and Add
            </Button>

            {bulkIssues.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-servora-red">
                  Resolve missing ingredients
                </div>
                {bulkIssues.map((line) => (
                  <div
                    key={line.raw}
                    className="rounded-md border border-gray-200 bg-white p-2"
                  >
                    <div className="text-sm font-medium text-servora-charcoal">
                      {line.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {line.quantityRequired
                        ? `${line.quantityRequired} ${line.unit}`
                        : "Quantity needed"}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1 justify-start px-0 py-0 text-xs text-servora-yellow hover:bg-transparent"
                      onClick={() => createMissingBulkIngredient(line)}
                    >
                      Create and add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ingredient
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Qty
                </th>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Unit
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    Search or paste ingredients to build this recipe.
                  </td>
                </tr>
              ) : (
                ingredients.map((ing, index) => {
                  const ingredient = ingredientsCatalog.find((item) => item.id === ing.ingredientId);
                  const highlighted = highlightedIngredientId === ing.ingredientId;

                  return (
                    <tr
                      key={ing.ingredientId}
                      className={highlighted ? "bg-yellow-50" : "hover:bg-gray-50"}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-servora-charcoal">
                          {ingredient?.name ?? "Unknown ingredient"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ingredient?.sku ?? "No SKU"} · {ingredient?.category ?? "Uncategorized"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          aria-label={`Quantity for ${ingredient?.name ?? "ingredient"}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={ing.quantityRequired}
                          onChange={(e) => updateIngredient(index, "quantityRequired", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          aria-label={`Unit for ${ingredient?.name ?? "ingredient"}`}
                          value={ing.unit}
                          onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                          options={unitOptions}
                          disabled
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2 py-1 text-xs"
                          onClick={() => removeIngredient(index)}
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
          {isPending ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
