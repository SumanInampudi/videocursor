"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  InventoryCompactTable,
  type InventoryRow,
} from "@/components/inventory/InventoryCompactTable";
import { RawMaterialCategoryNav } from "@/components/raw-materials/RawMaterialCategoryNav";
import { Button } from "@/components/ui/Button";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import {
  INVENTORY_LOW_STOCK_KEY,
  isInventoryItemLowStock,
} from "@/lib/inventory-stock";
import { filterAndRankSmartSearch } from "@/lib/smart-search";
import { formatCurrency } from "@/lib/units";

type InventorySummaryData = {
  totalItems: number;
  activeItems: number;
  lowStockCount: number;
  totalStockValue: number;
  totalPayables: number;
  creditPurchaseCount: number;
};

type InventoryViewProps = {
  items: InventoryRow[];
  summary: InventorySummaryData;
};

function inventorySearchFields(item: InventoryRow) {
  return [item.name, item.sku, item.category, item.description, item.supplier, item.storageLocation];
}

function MetricChip({
  label,
  value,
  sub,
  tone = "default",
  onClick,
  active,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "brand";
  onClick?: () => void;
  active?: boolean;
  href?: string;
}) {
  const toneClass =
    tone === "danger"
      ? active
        ? "border-red-300 bg-red-50"
        : "border-red-100 bg-white hover:border-red-200 hover:bg-red-50/50"
      : tone === "brand"
        ? active
          ? "border-brand-300 bg-brand-50"
          : "border-brand-100 bg-white hover:border-brand-200 hover:bg-brand-50/50"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50";

  const inner = (
    <>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-charcoal">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block rounded-lg border px-4 py-3 transition ${toneClass}`}>
        {inner}
      </Link>
    );
  }

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition ${toneClass}`}
    >
      {inner}
    </Tag>
  );
}

function resolveCategoryFilter(searchParams: URLSearchParams): string {
  const category = searchParams.get("category") ?? "";
  if (category) return category;
  if (searchParams.get("lowStock") === "true") return INVENTORY_LOW_STOCK_KEY;
  return "";
}

export function InventoryView({ items, summary }: InventoryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(() =>
    resolveCategoryFilter(searchParams)
  );

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setSelectedCategory(resolveCategoryFilter(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const s = search.trim();
      if (s) params.set("search", s);
      else params.delete("search");
      params.delete("lowStock");
      if (selectedCategory) params.set("category", selectedCategory);
      else params.delete("category");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, selectedCategory, searchParams, router, pathname]);

  const activeItems = useMemo(() => items.filter((item) => item.isActive), [items]);

  const lowStockItems = useMemo(
    () => activeItems.filter((item) => isInventoryItemLowStock(item)),
    [activeItems]
  );

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    const q = search.trim();

    if (selectedCategory === INVENTORY_LOW_STOCK_KEY) {
      list = lowStockItems;
    }

    if (q) {
      list = filterAndRankSmartSearch(list, q, inventorySearchFields);
    } else if (selectedCategory !== INVENTORY_LOW_STOCK_KEY) {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list = [...list].sort(
        (a, b) => Number(a.quantity) - Number(b.quantity)
      );
    }

    if (selectedCategory && selectedCategory !== INVENTORY_LOW_STOCK_KEY) {
      list = list.filter((item) => item.category === selectedCategory);
    }

    return list;
  }, [items, search, selectedCategory, lowStockItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, InventoryRow[]>();
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
  const isLowStockView = selectedCategory === INVENTORY_LOW_STOCK_KEY;
  const showGrouped = !selectedCategory && !isSearchActive;

  const resultLabel = useMemo(() => {
    if (isLowStockView) {
      return `${filtered.length} SKU${filtered.length === 1 ? "" : "s"} at or below reorder · sorted by quantity`;
    }
    if (!isSearchActive && !selectedCategory) {
      return `${filtered.length} stock items across ${grouped.length} categories`;
    }
    if (isSearchActive) {
      const suffix =
        selectedCategory && selectedCategory !== INVENTORY_LOW_STOCK_KEY
          ? ` in ${selectedCategory}`
          : "";
      return `${filtered.length} match${filtered.length === 1 ? "" : "es"} for “${search.trim()}”${suffix} · ranked by relevance`;
    }
    return `${filtered.length} in ${selectedCategory}`;
  }, [filtered.length, grouped.length, isLowStockView, isSearchActive, search, selectedCategory]);

  return (
    <>
      {items.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricChip
            label="Stock value"
            value={formatCurrency(summary.totalStockValue)}
            sub={`${summary.activeItems} active SKUs`}
            tone="brand"
          />
          <MetricChip
            label="Low stock"
            value={String(lowStockItems.length)}
            sub="At or below reorder"
            tone="danger"
            active={isLowStockView}
            onClick={() =>
              setSelectedCategory((c) =>
                c === INVENTORY_LOW_STOCK_KEY ? "" : INVENTORY_LOW_STOCK_KEY
              )
            }
          />
          <MetricChip label="Categories" value={String(categoryStats.length)} />
          <MetricChip
            label="Owed to suppliers"
            value={formatCurrency(summary.totalPayables)}
            sub={
              summary.creditPurchaseCount > 0
                ? `${summary.creditPurchaseCount} open purchase(s)`
                : "No open credit"
            }
            tone={summary.totalPayables > 0 ? "danger" : "default"}
            href="/inventory/payables"
          />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <SmartSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, category, location…"
          />
          <p className="mt-1 text-xs text-gray-400">Typo-tolerant · multi-word</p>
        </div>
        <Link href="/inventory/receive" className="shrink-0">
          <Button>Receive / Restock</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="empty-state rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16">
          <p className="empty-state-text">No stock on hand yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Add raw materials, then receive stock to build your inventory.
          </p>
          <Link href="/inventory/receive" className="mt-4 inline-block">
            <Button>Receive your first stock</Button>
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
          <aside className="hidden w-48 shrink-0 rounded-lg border border-gray-200 bg-gray-50 lg:block">
            <RawMaterialCategoryNav
              categories={categoryStats}
              totalCount={items.length}
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
                totalCount={items.length}
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
                    All active SKUs are above reorder level.
                  </p>
                )}
              </div>
            ) : (
              <InventoryCompactTable
                groups={showGrouped ? grouped : []}
                flatItems={showGrouped ? undefined : filtered}
                resultLabel={resultLabel}
                highlightLowStock={isLowStockView}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
