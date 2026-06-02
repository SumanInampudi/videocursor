"use client";

import { ChangeEvent, useRef, useState, useTransition } from "react";
import {
  bulkCreateIngredients,
  createIngredient,
  seedStarterIngredients,
} from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { UNITS } from "@/lib/units";

export function IngredientSetup() {
  const [isPending, startTransition] = useTransition();
  const [singleErrors, setSingleErrors] = useState<Record<string, string[]>>({});
  const [bulkErrors, setBulkErrors] = useState<Record<string, string[]>>({});
  const [bulkText, setBulkText] = useState("");
  const [message, setMessage] = useState("");
  const singleFormRef = useRef<HTMLFormElement>(null);

  const unitOptions = UNITS.map((unit) => ({ value: unit, label: unit }));

  function handleSingle(formData: FormData) {
    startTransition(async () => {
      const result = await createIngredient(formData);
      if (result.error) {
        setSingleErrors(result.error);
        setMessage("");
        return;
      }

      setSingleErrors({});
      setMessage("Ingredient added.");
      singleFormRef.current?.reset();
    });
  }

  function handleBulk(formData: FormData) {
    formData.set("items", bulkText);

    startTransition(async () => {
      const result = await bulkCreateIngredients(formData);
      if (result.error) {
        setBulkErrors(result.error);
        setMessage("");
        return;
      }

      setBulkErrors({});
      setBulkText("");
      setMessage(`Added ${result.created ?? 0} ingredients. Skipped ${result.skipped?.length ?? 0} duplicates.`);
    });
  }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const names = text
        .split(/\r?\n/)
        .flatMap((row) => row.split(","))
        .map((value) => value.trim())
        .filter(Boolean);

      setBulkText((current) => [current, ...names].filter(Boolean).join("\n"));
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function loadStarterSet() {
    startTransition(async () => {
      const result = await seedStarterIngredients();
      setMessage(`Starter set ready. Added ${result.created ?? 0}; skipped ${result.skipped?.length ?? 0} existing.`);
    });
  }

  return (
    <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <form
        ref={singleFormRef}
        action={handleSingle}
        className="card-padded"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-servora-charcoal">Quick Add</h2>
            <p className="text-xs text-gray-500">SKU is generated when left blank.</p>
          </div>
          <Button type="button" variant="secondary" onClick={loadStarterSet} disabled={isPending}>
            Load Starter Set
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="name" label="Name *" error={singleErrors.name?.[0]} required />
          <Input name="sku" label="SKU" error={singleErrors.sku?.[0]} placeholder="Auto" />
          <Input name="category" label="Category *" defaultValue="General" error={singleErrors.category?.[0]} required />
          <Select name="defaultUnit" label="Default Unit *" defaultValue="g" options={unitOptions} error={singleErrors.defaultUnit?.[0]} required />
          <Input
            name="wastagePercent"
            label="Expected wastage %"
            type="number"
            min={0}
            max={99}
            step={0.1}
            defaultValue={0}
            error={singleErrors.wastagePercent?.[0]}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Wastage applies to all stock for this ingredient: reduces usable quantity and increases
          recipe cost (FIFO uses oldest purchase cost first).
        </p>

        <Textarea name="aliases" label="Search Aliases" rows={2} className="mt-3" error={singleErrors.aliases?.[0]} />

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Add Ingredient"}
          </Button>
          {message && <span className="text-xs text-gray-500">{message}</span>}
        </div>
      </form>

      <form action={handleBulk} className="card-padded">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-servora-charcoal">Bulk Add / CSV Import</h2>
            <p className="text-xs text-gray-500">Paste names one per line, comma-separated, or import a CSV.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-servora-charcoal hover:bg-gray-50">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
          </label>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Input name="category" label="Category for Imported Items" defaultValue="General" />
          <Select name="defaultUnit" label="Default Unit" defaultValue="g" options={unitOptions} />
        </div>

        <Textarea
          name="items"
          label="Ingredient Names"
          rows={8}
          value={bulkText}
          onChange={(event) => setBulkText(event.target.value)}
          error={bulkErrors.items?.[0]}
          placeholder={"Chicken Bone-In\nChicken Boneless\nBasmati Rice"}
        />

        <div className="mt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Importing..." : "Add Multiple"}
          </Button>
        </div>
      </form>
    </div>
  );
}
