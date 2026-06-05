"use client";

import { ProductMenuTile } from "@/components/products/ProductMenuTile";

type PosItemTileProps = {
  name: string;
  price: number;
  imageUrl?: string | null;
  onAdd: () => void;
  disabled?: boolean;
};

export function PosItemTile({ name, price, imageUrl, onAdd, disabled }: PosItemTileProps) {
  return (
    <ProductMenuTile
      name={name}
      price={price}
      imageUrl={imageUrl}
      onClick={onAdd}
      disabled={disabled}
      variant="pos"
    />
  );
}
