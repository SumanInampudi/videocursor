"use client";

import { ProductMenuTile } from "@/components/products/ProductMenuTile";
import type { PosProductAvailability } from "@/lib/pos-stock-status";

type PosItemTileProps = {
  name: string;
  price: number;
  posCode?: number | null;
  imageUrl?: string | null;
  onAdd: () => void;
  disabled?: boolean;
  availability?: PosProductAvailability;
};

export function PosItemTile({
  name,
  price,
  posCode,
  imageUrl,
  onAdd,
  disabled,
  availability,
}: PosItemTileProps) {
  const outOfStock = availability?.status === "out" || availability?.status === "unavailable";
  const stockLabel = availability?.label;

  return (
    <div className="relative">
      {posCode != null && (
        <span className="absolute left-1.5 top-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded bg-servora-charcoal px-1 text-[11px] font-bold tabular-nums text-white">
          {posCode}
        </span>
      )}
      {availability && availability.status !== "ok" && (
        <span
          className={`absolute right-1.5 top-1.5 z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            outOfStock
              ? "bg-red-600 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          {outOfStock ? "Out" : stockLabel ?? "Low"}
        </span>
      )}
      <ProductMenuTile
        name={name}
        price={price}
        imageUrl={imageUrl}
        onClick={onAdd}
        disabled={disabled || outOfStock}
        variant="pos"
        subtitle={
          availability?.status === "low" && !outOfStock ? (
            <span className="text-amber-700">{stockLabel}</span>
          ) : undefined
        }
      />
    </div>
  );
}
