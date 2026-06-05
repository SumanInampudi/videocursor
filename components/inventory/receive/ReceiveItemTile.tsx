"use client";

import { ProductMenuTile } from "@/components/products/ProductMenuTile";
import { formatCurrency, formatQuantity } from "@/lib/units";

type ReceiveItemTileProps = {
  name: string;
  imageUrl?: string | null;
  lastUnitCost: number;
  stockQty: number | null;
  stockUnit: string | null;
  defaultUnit: string;
  onAdd: () => void;
  disabled?: boolean;
};

export function ReceiveItemTile({
  name,
  imageUrl,
  lastUnitCost,
  stockQty,
  stockUnit,
  defaultUnit,
  onAdd,
  disabled,
}: ReceiveItemTileProps) {
  const unit = stockUnit ?? defaultUnit;
  const subtitle =
    stockQty != null ? (
      <span>
        On hand: {formatQuantity(stockQty, unit)}
        {lastUnitCost > 0 ? ` · Last ${formatCurrency(lastUnitCost)}/${unit}` : ""}
      </span>
    ) : lastUnitCost > 0 ? (
      <span>Last {formatCurrency(lastUnitCost)}/{unit}</span>
    ) : (
      <span>Set cost in cart</span>
    );

  return (
    <ProductMenuTile
      name={name}
      price={lastUnitCost > 0 ? lastUnitCost : 0}
      imageUrl={imageUrl}
      onClick={onAdd}
      disabled={disabled}
      subtitle={subtitle}
      variant="pos"
    />
  );
}
