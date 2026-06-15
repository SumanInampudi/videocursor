"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RawMaterialAddModal } from "@/components/raw-materials/RawMaterialAddModal";
import { RawMaterialCategoryNav } from "@/components/raw-materials/RawMaterialCategoryNav";
import {
  RawMaterialCompactTable,
  type RawMaterialWithInventory,
} from "@/components/raw-materials/RawMaterialCompactTable";
import { RawMaterialEditModal } from "@/components/raw-materials/RawMaterialEditModal";
import { Button } from "@/components/ui/Button";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { useToast } from "@/components/ui/Toast";
import {
  isRawMaterialLowStock,
  RAW_MATERIAL_LOW_STOCK_KEY,
} from "@/lib/raw-material-stock";
import { filterAndRankSmartSearch } from "@/lib/smart-search";

type RawMaterialsViewProps = {
  ingredients: RawMaterialWithInventory[];
  categories: string[];
};

function rawMaterialSearchFields(item: RawMaterialWithInventory) {
  return [item.name, item.sku, item.category, item.aliases, item.defaultUnit];
}

function MetricChip({
  label,
  value,
  tone = "default",
  onClick,
  active,
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "brand";
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? active
        ? "border-red-300 bg-red-50 ring-2 ring-red-200"
        : "border-red-100 bg-white hover:border-red-200 hover:bg-red-50/50"
      : tone === "brand"
        ? active
          ? "border-brand-300 bg-brand-50 ring-2 ring-brand-200"
          : "border-brand-100 bg-white hover:border-brand-200 hover:bg-brand-50/50"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition ${toneClass}`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-charcoal">{value}</p>
    </Tag>
  );
}

export function RawMaterialsView({ ingredients, categories }: RawMaterialsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { success } = useToast();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterialWithInventory | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setSelectedCategory(searchParams.get("category") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const s = search.trim();
      if (s) params.set("search", s);
      else params.delete("search");
      if (selectedCategory) params.set("category", selectedCategory);
      else params.delete("category");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, selectedCategory, searchParams, router, pathname]);

  const lowStockItems = useMemo(
    () =>
      ingredients.filter((item) =>
        isRawMaterialLowStock(item.wastagePercent, item.inventoryItems)
      ),
    [ingredients]
  );

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of ingredients) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }));
  }, [ingredients]);

  const filtered = useMemo(() => {
    let list = ingredients;
    const q = search.trim();

    if (selectedCategory === RAW_MATERIAL_LOW_STOCK_KEY) {
      list = lowStockItems;
    }

    if (q) {
      list = filterAndRankSmartSearch(list, q, rawMaterialSearchFields);
    } else if (selectedCategory !== RAW_MATERIAL_LOW_STOCK_KEY) {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list = [...list].sort((a, b) => {
        const aQty = Number(a.inventoryItems?.[0]?.quantity ?? 0);
        const bQty = Number(b.inventoryItems?.[0]?.quantity ?? 0);
        return aQty - bQty;
      });
    }

    if (selectedCategory && selectedCategory !== RAW_MATERIAL_LOW_STOCK_KEY) {
      list = list.filter((item) => item.category === selectedCategory);
    }

    return list;
  }, [ingredients, search, selectedCategory, lowStockItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, RawMaterialWithInventory[]>();
    for (const item of filtered) {
      const bucket = map.get(item.category) ?? [];
      bucket.push(item);
      map.set(item.category, bucket);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({ category, items }));
  }, [filtered]);

  const isSearchActive = search.trim().length > 0;
  const isLowStockView = selectedCategory === RAW_MATERIAL_LOW_STOCK_KEY;
  const showGrouped = !selectedCategory && !isSearchActive;

  const resultLabel = useMemo(() => {
    if (isLowStockView) {
      return `${filtered.length} material${filtered.length === 1 ? "" : "s"} need restocking · sorted by quantity`;
    }
    if (!isSearchActive && !selectedCategory) {
      return `${filtered.length} raw materials across ${grouped.length} categories`;
    }
    if (isSearchActive) {
      const suffix =
        selectedCategory && selectedCategory !== RAW_MATERIAL_LOW_STOCK_KEY
          ? ` in ${selectedCategory}`
          : isLowStockView
            ? " in low stock"
            : "";
      return `${filtered.length} match${filtered.length === 1 ? "" : "es"} for “${search.trim()}”${suffix} · ranked by relevance`;
    }
    return `${filtered.length} in ${selectedCategory}`;
  }, [filtered.length, grouped.length, isLowStockView, isSearchActive, search, selectedCategory]);

  function refresh() {
    router.refresh();
  }

  return (
    <>
      {ingredients.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <MetricChip label="Total materials" value={ingredients.length} tone="brand" />
          <MetricChip
            label="Low stock"
            value={lowStockItems.length}
            tone="danger"
            active={isLowStockView}
            onClick={() =>
              setSelectedCategory((c) =>
                c === RAW_MATERIAL_LOW_STOCK_KEY ? "" : RAW_MATERIAL_LOW_STOCK_KEY
              )
            }
          />
          <MetricChip label="Categories" value={categoryStats.length} />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <SmartSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, category…"
          />
          <p className="mt-1 text-xs text-gray-400">
            Typo-tolerant · multi-word
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)} className="shrink-0">
          + Add raw material
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <div className="empty-state rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 py-16">
          <p className="empty-state-text">No raw materials yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Add your first item — SKU and stock line are created automatically.
          </p>
          <Button type="button" className="mt-4" onClick={() => setAddOpen(true)}>
            + Add raw material
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
          <aside className="hidden w-48 shrink-0 rounded-lg border border-gray-200 bg-gray-50 lg:block">
              <RawMaterialCategoryNav
                categories={categoryStats}
                totalCount={ingredients.length}
                lowStockCount={lowStockItems.length}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                variant="sidebar"
              />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-3 lg:hidden">
              <RawMaterialCategoryNav
                categories={categoryStats}
                totalCount={ingredients.length}
                lowStockCount={lowStockItems.length}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                variant="pills"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="card-padded text-center">
                <p className="text-sm text-gray-500">No items match your filters.</p>
                {isLowStockView && (
                  <p className="mt-1 text-xs text-gray-400">
                    Everything with a stock SKU is above reorder level.
                  </p>
                )}
              </div>
            ) : (
              <RawMaterialCompactTable
                groups={showGrouped ? grouped : []}
                flatItems={showGrouped ? undefined : filtered}
                onEdit={setEditing}
                resultLabel={resultLabel}
                highlightLowStock={isLowStockView}
              />
            )}
          </div>
        </div>
      )}

      <RawMaterialAddModal
        open={addOpen}
        categories={categories}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          success("Raw material added");
          refresh();
        }}
      />

      <RawMaterialEditModal
        open={editing != null}
        ingredient={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => {
          success("Raw material updated");
          refresh();
        }}
      />
    </>
  );
}
