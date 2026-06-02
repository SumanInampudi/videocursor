"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type InventoryFiltersProps = {
  categories: string[];
};

export function InventoryFilters({ categories }: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="filter-bar">
      <div className="min-w-[200px] flex-1">
        <Input
          label="Search"
          placeholder="Search by name, SKU, or category..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
      </div>
      <div className="w-48">
        <Select
          label="Category"
          value={searchParams.get("category") ?? ""}
          onChange={(e) => updateFilter("category", e.target.value)}
          options={categoryOptions}
        />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm text-servora-charcoal">
          <input
            type="checkbox"
            checked={searchParams.get("lowStock") === "true"}
            onChange={(e) => updateFilter("lowStock", e.target.checked ? "true" : "")}
            className="h-4 w-4 rounded border-gray-300 text-servora-yellow focus:ring-servora-yellow"
          />
          Low stock only
        </label>
      </div>
    </div>
  );
}
