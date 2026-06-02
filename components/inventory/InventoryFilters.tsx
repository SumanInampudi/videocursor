"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";

type InventoryFiltersProps = {
  categories: string[];
};

export function InventoryFilters({ categories }: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateFilter = useCallback(
    (key: string, value: string, useReplace = false) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const queryString = params.toString();
      const target = queryString ? `/inventory?${queryString}` : "/inventory";
      if (useReplace) {
        router.replace(target, { scroll: false });
      } else {
        router.push(target);
      }
    },
    [router, searchParams]
  );

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (search === current) return;
      updateFilter("search", search.trim(), true);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, searchParams, updateFilter]);

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="filter-bar">
      <div className="min-w-[200px] flex-1">
        <SmartSearchInput
          placeholder="Search by name, SKU, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
