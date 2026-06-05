"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createQuickRawMaterial } from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { UNITS } from "@/lib/units";

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

type ParsedBulkLine = {
  raw: string;
  name: string;
  quantityRequired: string;
  unit: string;
};

type InventoryOption = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number | string;
};

type ProductFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  ingredients: RawMaterialOption[];
  inventoryItems?: InventoryOption[];
  initialData?: {
    name: string;
    description: string | null;
    category: string;
    yieldQuantity: number;
    yieldUnit: string;
    salePrice?: number | null;
    prepTimeMinutes?: number | null;
    instructions: string | null;
    productType?: "PREPARED" | "RETAIL";
    requiresKitchen?: boolean;
    retailInventoryItemId?: string | null;
    retailQuantityPerSale?: number | null;
    ingredients: {
      ingredientId: string;
      quantityRequired: number;
      unit: string;
    }[];
  };
  submitLabel?: string;
  estimatedRawMaterialCostPerSale?: number | null;
};

export function ProductForm({
  action,
  ingredients: initialIngredients,
  inventoryItems = [],
  initialData,
  submitLabel = "Save Product",
  estimatedRawMaterialCostPerSale = null,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddingIngredient, startAddingIngredient] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [rawMaterialsCatalog, setRawMaterialsCatalog] = useState(initialIngredients);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkIssues, setBulkIssues] = useState<ParsedBulkLine[]>([]);
  const [highlightedRawMaterialId, setHighlightedRawMaterialId] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [productType, setProductType] = useState<"PREPARED" | "RETAIL">(
    initialData?.productType ?? "PREPARED"
  );
  const [requiresKitchen, setRequiresKitchen] = useState(
    initialData?.requiresKitchen ?? initialData?.productType !== "RETAIL"
  );
  const [retailInventoryItemId, setRetailInventoryItemId] = useState(
    initialData?.retailInventoryItemId ?? ""
  );
  const [retailQuantityPerSale, setRetailQuantityPerSale] = useState(
    initialData?.retailQuantityPerSale != null
      ? String(initialData.retailQuantityPerSale)
      : "1"
  );
  const [rawMaterials, setRawMaterials] = useState<RawMaterialRow[]>(
    initialData?.ingredients.map((ing) => ({
        rawMaterialId: ing.ingredientId,
        quantityRequired: String(ing.quantityRequired),
        unit: ing.unit,
    })) ?? []
  );
  const [salePrice, setSalePrice] = useState(
    initialData?.salePrice != null ? String(initialData.salePrice) : ""
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    initialData?.prepTimeMinutes != null ? String(initialData.prepTimeMinutes) : ""
  );

  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  const selectedRawMaterialIds = useMemo(
    () => new Set(rawMaterials.map((rawMaterial) => rawMaterial.rawMaterialId)),
    [rawMaterials]
  );

  const filteredIngredients = useMemo(() => {
    const search = ingredientSearch.trim().toLowerCase();

    if (!search) return rawMaterialsCatalog.slice(0, 18);

    return rawMaterialsCatalog
      .filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(search) ||
          ingredient.sku.toLowerCase().includes(search) ||
          ingredient.category.toLowerCase().includes(search) ||
          ingredient.aliases?.toLowerCase().includes(search)
      )
      .slice(0, 24);
  }, [ingredientSearch, rawMaterialsCatalog]);

  const groupedIngredients = useMemo(() => {
    return filteredIngredients.reduce<Record<string, RawMaterialOption[]>>((groups, ingredient) => {
      groups[ingredient.category] = groups[ingredient.category] ?? [];
      groups[ingredient.category].push(ingredient);
      return groups;
    }, {});
  }, [filteredIngredients]);
  const salePriceValue = Number(salePrice || 0);
  const hasCostEstimate = estimatedRawMaterialCostPerSale != null;
  const marginAmount =
    hasCostEstimate && salePriceValue > 0
      ? salePriceValue - Number(estimatedRawMaterialCostPerSale)
      : null;
  const marginPercent =
    marginAmount != null && salePriceValue > 0 ? (marginAmount / salePriceValue) * 100 : null;

  function updateRawMaterial(index: number, field: keyof RawMaterialRow, value: string) {
    const updated = [...rawMaterials];
    updated[index] = { ...updated[index], [field]: value };

    setRawMaterials(updated);
  }

  function removeRawMaterial(index: number) {
    setRawMaterials(rawMaterials.filter((_, i) => i !== index));
  }

  function flashExisting(rawMaterialId: string) {
    setHighlightedRawMaterialId(rawMaterialId);
    window.setTimeout(() => setHighlightedRawMaterialId(""), 1200);
  }

  function addRawMaterialToRecipe(
    rawMaterial: RawMaterialOption,
    values?: Partial<RawMaterialRow>
  ) {
    setBuilderError("");

    if (selectedRawMaterialIds.has(rawMaterial.id)) {
      flashExisting(rawMaterial.id);
      return;
    }

    setRawMaterials((current) => [
      ...current,
      {
        rawMaterialId: rawMaterial.id,
        quantityRequired: values?.quantityRequired ?? "",
        unit: rawMaterial.defaultUnit,
      },
    ]);
    setIngredientSearch("");
  }

  function addCreatedRawMaterialToCatalog(rawMaterial: RawMaterialOption) {
    setRawMaterialsCatalog((current) => {
      const exists = current.some((item) => item.id === rawMaterial.id);
      if (exists) return current;
      return [...current, rawMaterial].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function quickAddRawMaterial(name: string, values?: Partial<RawMaterialRow>) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    startAddingIngredient(async () => {
      const result = await createQuickRawMaterial(trimmedName);
      if (result.ingredient) {
        const rawMaterial = {
          ...result.ingredient,
          aliases: null,
        } as RawMaterialOption;
        addCreatedRawMaterialToCatalog(rawMaterial);
        addRawMaterialToRecipe(rawMaterial, {
          ...values,
          unit: rawMaterial.defaultUnit,
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
    return rawMaterialsCatalog.find(
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
      setBuilderError("Paste at least one raw material line.");
      return;
    }

    const unresolved: ParsedBulkLine[] = [];
    const handledIds = new Set(selectedRawMaterialIds);
    const unresolvedNames = new Set<string>();

    parsed.forEach((line) => {
      const match = findCatalogMatch(line.name);
      if (match) {
        if (handledIds.has(match.id)) {
          flashExisting(match.id);
          return;
        }

        handledIds.add(match.id);
        addRawMaterialToRecipe(match, {
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
    quickAddRawMaterial(line.name, {
      quantityRequired: line.quantityRequired,
    });
    setBulkIssues((current) => current.filter((item) => item.raw !== line.raw));
  }

  function handleSubmit(formData: FormData) {
    formData.set("productType", productType);
    if (requiresKitchen) {
      formData.set("requiresKitchen", "on");
    }

    if (productType === "RETAIL") {
      if (!retailInventoryItemId) {
        setBuilderError("Select the inventory item you sell (e.g. Coke can).");
        return;
      }
      if (!retailQuantityPerSale || Number(retailQuantityPerSale) <= 0) {
        setBuilderError("Quantity per sale must be greater than 0.");
        return;
      }
      formData.set("retailInventoryItemId", retailInventoryItemId);
      formData.set("retailQuantityPerSale", retailQuantityPerSale);
      formData.set("ingredientCount", "0");
      setBuilderError("");
    } else {
      if (rawMaterials.length === 0) {
        setBuilderError("Add at least one raw material to the product.");
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
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
      } else {
        router.push("/products");
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-6">
      <div className="card-padded space-y-4">
        <div>
          <p className="form-label mb-2">Menu item type</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={productType === "PREPARED" ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setProductType("PREPARED");
                setRequiresKitchen(true);
              }}
            >
              Prepared dish
            </Button>
            <Button
              type="button"
              variant={productType === "RETAIL" ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setProductType("RETAIL");
                setRequiresKitchen(false);
              }}
            >
              Retail / resale
            </Button>
          </div>
          <p className="form-hint mt-2">
            {productType === "RETAIL"
              ? "Sell stock directly (Coke, chips, bottled water). Links to inventory — no kitchen prep."
              : "Made in kitchen from raw materials (BOM)."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <input
            type="checkbox"
            checked={requiresKitchen}
            onChange={(e) => setRequiresKitchen(e.target.checked)}
            className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
          />
          Send to kitchen display (KDS)
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Product Name *"
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

      {productType === "RETAIL" ? (
        <div className="card-padded space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="section-title">Retail stock link</h3>
            <Badge variant="primary">Resale</Badge>
          </div>
          <p className="form-hint">
            Receive stock under Inventory → Stock receive, then sell it here on POS.
          </p>
          <Select
            label="Inventory item *"
            value={retailInventoryItemId}
            onChange={(e) => {
              const id = e.target.value;
              setRetailInventoryItemId(id);
              const item = inventoryItems.find((i) => i.id === id);
              if (item && !initialData?.yieldUnit) {
                const yieldInput = document.querySelector<HTMLInputElement>(
                  'input[name="yieldUnit"]'
                );
                if (yieldInput) yieldInput.value = item.unit;
              }
            }}
            options={[
              { value: "", label: "Select inventory SKU…" },
              ...inventoryItems.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.sku}) · ${Number(item.quantity)} ${item.unit} on hand`,
              })),
            ]}
            error={errors.retailInventoryItemId?.[0]}
          />
          <Input
            label="Quantity per sale *"
            type="number"
            step="0.01"
            min="0.01"
            value={retailQuantityPerSale}
            onChange={(e) => setRetailQuantityPerSale(e.target.value)}
            hint="Usually 1 for a bottle or can (pcs)."
            error={errors.retailQuantityPerSale?.[0]}
          />
        </div>
      ) : (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-servora-charcoal">Raw Materials (BOM) *</h3>
        </div>

        {(errors.ingredients || builderError) && (
          <p className="mb-2 text-xs text-servora-red">
            {builderError || errors.ingredients?.[0]}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="card-padded">
            <label className="text-sm font-medium text-servora-charcoal">
              Search Raw Material Master
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
                onClick={() => quickAddRawMaterial(ingredientSearch)}
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
                      const selected = selectedRawMaterialIds.has(ingredient.id);
                      return (
                        <button
                          key={ingredient.id}
                          type="button"
                          onClick={() => addRawMaterialToRecipe(ingredient)}
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
                  No raw material found
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-1 justify-start px-0 py-0 text-xs text-servora-yellow hover:bg-transparent"
                  disabled={isAddingIngredient}
                  onClick={() => quickAddRawMaterial(ingredientSearch)}
                >
                  Create &quot;{ingredientSearch.trim()}&quot; and add it
                </Button>
              </div>
            )}
          </div>

          <div className="filter-bar">
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

        <div className="mt-4 table-panel">
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
              {rawMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    Search or paste ingredients to build this product.
                  </td>
                </tr>
              ) : (
                rawMaterials.map((ing, index) => {
                  const ingredient = rawMaterialsCatalog.find((item) => item.id === ing.rawMaterialId);
                  const highlighted = highlightedRawMaterialId === ing.rawMaterialId;

                  return (
                    <tr
                      key={ing.rawMaterialId}
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
                          onChange={(e) => updateRawMaterial(index, "quantityRequired", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          aria-label={`Unit for ${ingredient?.name ?? "ingredient"}`}
                          value={ing.unit}
                          onChange={(e) => updateRawMaterial(index, "unit", e.target.value)}
                          options={unitOptions}
                          disabled
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2 py-1 text-xs"
                          onClick={() => removeRawMaterial(index)}
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
      )}

      <div className="card-padded space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Pricing</h3>
          <Badge variant="primary">Menu Price</Badge>
        </div>
        <p className="form-hint">
          Set sale price while creating the menu item; margin uses estimated raw material cost.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="salePrice"
            label="Sale Price"
            type="number"
            step="0.01"
            min="0"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            error={errors.salePrice?.[0]}
            placeholder="0.00"
          />
          <Input
            name="prepTimeMinutes"
            label="Prep Time (min)"
            type="number"
            min="1"
            step="1"
            value={prepTimeMinutes}
            onChange={(e) => setPrepTimeMinutes(e.target.value)}
            error={errors.prepTimeMinutes?.[0]}
            placeholder="Optional"
          />
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {hasCostEstimate ? (
            <div className="flex flex-wrap items-center gap-4">
              <span>
                Est. raw material cost: <strong>{Number(estimatedRawMaterialCostPerSale).toFixed(2)}</strong>
              </span>
              <span>
                Margin:{" "}
                <strong>
                  {marginAmount != null ? `${marginAmount.toFixed(2)} (${marginPercent?.toFixed(1)}%)` : "Set price to view"}
                </strong>
              </span>
            </div>
          ) : (
            <span>Margin preview appears after first save when cost estimate is available.</span>
          )}
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
