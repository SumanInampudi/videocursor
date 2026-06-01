"use client";

import { useMemo } from "react";
import { ReceiveItemTile } from "@/components/inventory/receive/ReceiveItemTile";
import type { ReceiveCatalogItem } from "@/lib/stock-receive-cart";

type ReceiveItemGridProps = {
  items: ReceiveCatalogItem[];
  frequentIds: string[];
  selectedCategory: string;
  search: string;
  onAdd: (item: ReceiveCatalogItem) => void;
  disabled?: boolean;
};

export function ReceiveItemGrid({
  items,
  frequentIds,
  selectedCategory,
  search,
  onAdd,
  disabled,
}: ReceiveItemGridProps) {
  const filtered = useMemo(() => {
    let list = items;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    } else if (selectedCategory === "frequent") {
      const idSet = new Set(frequentIds);
      list = items.filter((i) => idSet.has(i.id));
      list.sort((a, b) => frequentIds.indexOf(a.id) - frequentIds.indexOf(b.id));
    } else if (selectedCategory !== "all") {
      list = list.filter((i) => i.category === selectedCategory);
    }
    return list;
  }, [items, search, selectedCategory, frequentIds]);

  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        No active ingredients. Add ingredients under{" "}
        <a href="/ingredients" className="font-medium underline">
          Ingredients
        </a>{" "}
        first.
      </p>
    );
  }

  if (filtered.length === 0) {
    return <p className="text-sm text-gray-500">No items match your search.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filtered.map((item) => (
        <ReceiveItemTile
          key={item.id}
          name={item.name}
          lastUnitCost={item.lastUnitCost}
          stockQty={item.stockQty}
          stockUnit={item.stockUnit}
          defaultUnit={item.defaultUnit}
          onAdd={() => onAdd(item)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
