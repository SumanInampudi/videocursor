"use client";

import { RecipeMenuTile } from "@/components/recipes/RecipeMenuTile";
import { formatCurrency, formatQuantity } from "@/lib/units";

type ReceiveItemTileProps = {
  name: string;
  lastUnitCost: number;
  stockQty: number | null;
  stockUnit: string | null;
  defaultUnit: string;
  onAdd: () => void;
  disabled?: boolean;
};

export function ReceiveItemTile({
  name,
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
    <RecipeMenuTile
      name={name}
      price={lastUnitCost > 0 ? lastUnitCost : 0}
      onClick={onAdd}
      disabled={disabled}
      subtitle={subtitle}
      variant="pos"
    />
  );
}
