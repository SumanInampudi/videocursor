"use client";

import { RecipeBarcode } from "@/components/recipes/RecipeBarcode";
import { formatBarcodeDisplay } from "@/lib/barcode";

type IngredientRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  defaultUnit: string;
  isActive: boolean;
};

export function IngredientBarcodeGrid({ ingredients }: { ingredients: IngredientRow[] }) {
  if (ingredients.length === 0) {
    return <p className="text-sm text-gray-500">No ingredients found.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ingredients.map((ingredient) => (
        <article
          key={ingredient.id}
          className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-center font-semibold text-servora-charcoal">{ingredient.name}</h3>
          <p className="mt-1 text-xs text-gray-500">
            {ingredient.sku} · {ingredient.category}
          </p>
          <RecipeBarcode barcode={ingredient.barcode} className="mt-4" />
          <p className="mt-2 font-mono text-xs text-gray-600">
            Scan: {formatBarcodeDisplay(ingredient.barcode)}
          </p>
          {!ingredient.isActive && (
            <span className="mt-2 text-xs text-servora-red">Inactive</span>
          )}
        </article>
      ))}
    </div>
  );
}
