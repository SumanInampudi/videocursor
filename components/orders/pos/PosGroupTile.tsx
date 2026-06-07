"use client";

import { ProductMenuTile } from "@/components/products/ProductMenuTile";
import { formatCurrency } from "@/lib/units";
import type { PosVariantGroup } from "@/lib/pos-variant-groups";
import { variantGroupFromPrice } from "@/lib/pos-variant-groups";
import type { PosProductAvailability } from "@/lib/pos-stock-status";

type PosGroupTileProps = {
  group: PosVariantGroup;
  onOpen: () => void;
  disabled?: boolean;
  availability?: Record<string, PosProductAvailability>;
};

export function PosGroupTile({ group, onOpen, disabled, availability = {} }: PosGroupTileProps) {
  const fromPrice = variantGroupFromPrice(group.variants);
  const availList = group.variants
    .map((v) => availability[v.id])
    .filter((a): a is PosProductAvailability => a != null);
  const anyInStock = availList.some((a) => a.status === "ok" || a.status === "low");
  const allOut =
    availList.length > 0 && availList.every((a) => a.status === "out" || a.status === "unavailable");
  const outOfStock = allOut || (availList.length === 0 && group.variants.length > 0);

  return (
    <div className="relative">
      <span className="absolute left-1.5 top-1.5 z-10 rounded bg-teal-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {group.variants.length} sizes
      </span>
      {allOut && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Out
        </span>
      )}
      <ProductMenuTile
        name={group.name}
        price={fromPrice ?? 0}
        imageUrl={group.imageUrl}
        onClick={onOpen}
        disabled={disabled || outOfStock}
        variant="pos"
        subtitle={
          <span className="text-gray-500">
            {fromPrice != null ? `from ${formatCurrency(fromPrice)}` : "Set prices"}
            {anyInStock && !allOut ? ` · ${group.variants.length} packs` : ""}
          </span>
        }
      />
    </div>
  );
}
