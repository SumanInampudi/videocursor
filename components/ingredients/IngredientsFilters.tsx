"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";

type IngredientsFiltersProps = {
  categories: string[];
};

export function IngredientsFilters({ categories }: IngredientsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setCategory(searchParams.get("category") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const s = search.trim();
      if (s) params.set("search", s);
      else params.delete("search");
      if (category) params.set("category", category);
      else params.delete("category");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, category, searchParams, router, pathname]);

  return (
    <div className="mb-4 grid gap-3 filter-bar md:grid-cols-[1fr_220px]">
      <SmartSearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, SKU, barcode, category, alias…"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="select-field"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

