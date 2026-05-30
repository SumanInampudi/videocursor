"use client";

import { Badge } from "@/components/ui/Badge";
import { Ingredient, InventoryItem } from "@prisma/client";

type IngredientWithInventory = Ingredient & {
  inventoryItems: InventoryItem[];
};

export function IngredientTable({ ingredients }: { ingredients: IngredientWithInventory[] }) {
  if (ingredients.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">No ingredients found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ingredient</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">SKU</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Inventory Links</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {ingredients.map((ingredient) => (
            <tr key={ingredient.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-servora-charcoal">{ingredient.name}</div>
                {ingredient.aliases && <div className="text-xs text-gray-500">{ingredient.aliases}</div>}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{ingredient.sku}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ingredient.category}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ingredient.defaultUnit}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ingredient.inventoryItems.length}</td>
              <td className="px-4 py-3">
                <Badge variant={ingredient.isActive ? "success" : "default"}>
                  {ingredient.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
