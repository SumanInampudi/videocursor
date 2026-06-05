"use client";

import { useMemo } from "react";
import { PosItemTile } from "@/components/orders/pos/PosItemTile";
import { smartMatches } from "@/lib/smart-search";
import type { PricedProduct } from "@/lib/order-cart";

type Product = PricedProduct & {
  category: string;
  imageUrl?: string | null;
  productType?: "PREPARED" | "RETAIL";
  requiresKitchen?: boolean;
};

type PosItemGridProps = {
  products: Product[];
  frequentIds: string[];
  selectedCategory: string;
  search: string;
  onAdd: (product: Product) => void;
  disabled?: boolean;
};

export function PosItemGrid({
  products,
  frequentIds,
  selectedCategory,
  search,
  onAdd,
  disabled,
}: PosItemGridProps) {
  const priced = useMemo(
    () => products.filter((r) => r.salePrice != null),
    [products]
  );

  const filtered = useMemo(() => {
    let list = priced;
    const q = search.trim();
    if (q) {
      list = list.filter((r) =>
        smartMatches(
          [
            r.name,
            r.category,
            r.productType,
            r.requiresKitchen ? "kitchen" : "no kitchen",
          ],
          q
        )
      );
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
        <a href="/products/pricing" className="font-medium underline">
          product pricing
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
      {filtered.map((product) => (
        <PosItemTile
          key={product.id}
          name={product.name}
          price={Number(product.salePrice)}
          imageUrl={product.imageUrl}
          onAdd={() => onAdd(product)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
