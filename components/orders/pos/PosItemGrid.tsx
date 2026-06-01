"use client";

import { useMemo } from "react";
import { PosItemTile } from "@/components/orders/pos/PosItemTile";
import type { PricedRecipe } from "@/lib/order-cart";

type Recipe = PricedRecipe & { category: string; imageUrl?: string | null };

type PosItemGridProps = {
  recipes: Recipe[];
  frequentIds: string[];
  selectedCategory: string;
  search: string;
  onAdd: (recipe: Recipe) => void;
  disabled?: boolean;
};

export function PosItemGrid({
  recipes,
  frequentIds,
  selectedCategory,
  search,
  onAdd,
  disabled,
}: PosItemGridProps) {
  const priced = useMemo(
    () => recipes.filter((r) => r.salePrice != null),
    [recipes]
  );

  const filtered = useMemo(() => {
    let list = priced;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    } else if (selectedCategory === "frequent") {
      const idSet = new Set(frequentIds);
      list = priced.filter((r) => idSet.has(r.id));
      list.sort(
        (a, b) => frequentIds.indexOf(a.id) - frequentIds.indexOf(b.id)
      );
    } else if (selectedCategory !== "all") {
      list = list.filter((r) => r.category === selectedCategory);
    }
    return list;
  }, [priced, search, selectedCategory, frequentIds]);

  if (priced.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        No priced items. Set sale prices on{" "}
        <a href="/recipes/pricing" className="font-medium underline">
          recipe pricing
        </a>{" "}
        first.
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        {selectedCategory === "frequent"
          ? "No sales yet — items will appear here after delivered orders."
          : "No items match your search."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-3">
      {filtered.map((recipe) => (
        <PosItemTile
          key={recipe.id}
          name={recipe.name}
          price={Number(recipe.salePrice)}
          imageUrl={recipe.imageUrl}
          onAdd={() => onAdd(recipe)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
