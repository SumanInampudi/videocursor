"use client";

import { RAW_MATERIAL_LOW_STOCK_KEY } from "@/lib/raw-material-stock";

type CategoryStat = {
  category: string;
  count: number;
};

type RawMaterialCategoryNavProps = {
  categories: CategoryStat[];
  totalCount: number;
  lowStockCount: number;
  selected: string;
  onSelect: (category: string) => void;
  variant?: "sidebar" | "pills";
};

type NavItem = {
  key: string;
  label: string;
  count: number;
  tone: "all" | "danger" | "category";
};

function navButtonClass(selected: boolean, tone: NavItem["tone"]) {
  if (!selected) {
    return "text-gray-700 hover:bg-gray-50";
  }
  if (tone === "danger") {
    return "bg-red-50 font-medium text-red-800";
  }
  return "bg-brand-50 font-medium text-brand-900";
}

export function RawMaterialCategoryNav({
  categories,
  totalCount,
  lowStockCount,
  selected,
  onSelect,
  variant = "sidebar",
}: RawMaterialCategoryNavProps) {
  const smartItems: NavItem[] = [
    { key: "", label: "All", count: totalCount, tone: "all" },
    {
      key: RAW_MATERIAL_LOW_STOCK_KEY,
      label: "Low stock",
      count: lowStockCount,
      tone: "danger",
    },
  ];

  const categoryItems: NavItem[] = categories.map((c) => ({
    key: c.category,
    label: c.category,
    count: c.count,
    tone: "category" as const,
  }));

  if (variant === "pills") {
    const allItems = [...smartItems, ...categoryItems];
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {allItems.map((item) => (
          <button
            key={item.key || "all"}
            type="button"
            onClick={() => onSelect(item.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${navButtonClass(
              selected === item.key,
              item.tone
            )}`}
          >
            {item.label}
            <span className="ml-1.5 tabular-nums text-gray-400">{item.count}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="flex h-full flex-col gap-3 overflow-y-auto p-2">
      <div>
        <p className="mb-1 px-2 text-xs font-medium text-gray-400">Views</p>
        <div className="space-y-0.5">
          {smartItems.map((item) => (
            <button
              key={item.key || "all"}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${navButtonClass(
                selected === item.key,
                item.tone
              )}`}
            >
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums text-gray-400">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 px-2 text-xs font-medium text-gray-400">Categories</p>
        <div className="space-y-0.5">
          {categoryItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${navButtonClass(
                selected === item.key,
                item.tone
              )}`}
            >
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums text-gray-400">{item.count}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
