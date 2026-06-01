"use client";

import { RecipeMenuTile } from "@/components/recipes/RecipeMenuTile";

type PosItemTileProps = {
  name: string;
  price: number;
  imageUrl?: string | null;
  onAdd: () => void;
  disabled?: boolean;
};

export function PosItemTile({ name, price, imageUrl, onAdd, disabled }: PosItemTileProps) {
  return (
    <RecipeMenuTile
      name={name}
      price={price}
      imageUrl={imageUrl}
      onClick={onAdd}
      disabled={disabled}
      variant="pos"
    />
  );
}
