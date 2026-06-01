"use client";

import { RecipeThumbnail } from "@/components/recipes/RecipeThumbnail";
import { formatCurrency } from "@/lib/units";

type RecipeMenuTileProps = {
  name: string;
  price: number;
  imageUrl?: string | null;
  onClick: () => void;
  disabled?: boolean;
  subtitle?: React.ReactNode;
  variant?: "pos" | "order";
};

/** Tappable menu item with image thumbnail — POS register and simple order form. */
export function RecipeMenuTile({
  name,
  price,
  imageUrl,
  onClick,
  disabled,
  subtitle,
  variant = "pos",
}: RecipeMenuTileProps) {
  if (variant === "order") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="touch-target flex gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left transition hover:border-servora-yellow hover:bg-yellow-50/40 disabled:opacity-50 sm:p-3"
      >
        <RecipeThumbnail name={name} imageUrl={imageUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-servora-charcoal">{name}</div>
          <div className="text-sm text-gray-600">{formatCurrency(price)}</div>
          {subtitle && <div className="mt-0.5">{subtitle}</div>}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="touch-target flex min-h-[108px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition active:scale-[0.98] hover:border-servora-yellow hover:shadow-md disabled:opacity-50 md:min-h-[120px]"
    >
      <div className="relative h-16 w-full shrink-0 md:h-20">
        <RecipeThumbnail name={name} imageUrl={imageUrl} size="tile" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-2 md:p-3">
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-servora-charcoal">
          {name}
        </span>
        <span className="mt-1 text-base font-bold text-servora-charcoal md:text-lg">
          {formatCurrency(price)}
        </span>
        {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
      </div>
    </button>
  );
}
