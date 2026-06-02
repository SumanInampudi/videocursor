"use client";

import { RecipeBarcode } from "@/components/recipes/RecipeBarcode";
import { formatBarcodeDisplay } from "@/lib/barcode";
import { formatCurrency } from "@/lib/units";

type RecipeRow = {
  id: string;
  name: string;
  category: string;
  salePrice: { toString(): string } | null;
  barcode: string;
};

export function RecipeBarcodeGrid({ recipes }: { recipes: RecipeRow[] }) {
  if (recipes.length === 0) {
    return <p className="text-sm text-gray-500">No recipes yet.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {recipes.map((recipe) => (
        <article
          key={recipe.id}
          className="flex flex-col items-center card-padded"
        >
          <h3 className="text-center font-semibold text-servora-charcoal">{recipe.name}</h3>
          <p className="mt-1 text-xs text-gray-500">{recipe.category}</p>
          {recipe.salePrice != null && (
            <p className="mt-1 text-sm font-medium text-servora-charcoal">
              {formatCurrency(Number(recipe.salePrice))}
            </p>
          )}
          <RecipeBarcode barcode={recipe.barcode} className="mt-4" />
          <p className="mt-2 font-mono text-xs text-gray-600">
            {formatBarcodeDisplay(recipe.barcode)}
          </p>
        </article>
      ))}
    </div>
  );
}
