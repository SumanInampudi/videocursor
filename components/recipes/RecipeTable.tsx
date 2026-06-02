"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteRecipe } from "@/app/actions/recipes";
import { RecipeThumbnail } from "@/components/recipes/RecipeThumbnail";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { YieldResult } from "@/lib/yield";

type RecipeWithYield = {
  id: string;
  name: string;
  imageUrl?: string | null;
  category: string;
  yieldUnit: string;
  ingredients: { id: string }[];
  yieldResult: YieldResult;
};

type RecipeTableProps = {
  recipes: RecipeWithYield[];
};

export function RecipeTable({ recipes }: RecipeTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete recipe "${name}"?`)) return;

    startTransition(async () => {
      const result = await deleteRecipe(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (recipes.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">No recipes found.</p>
        <Link href="/recipes/new" className="mt-4 inline-block">
          <Button>Create your first recipe</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Recipe
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Ingredients
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Max Yield
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Bottleneck
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {recipes.map((recipe) => (
            <tr key={recipe.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <RecipeThumbnail name={recipe.name} imageUrl={recipe.imageUrl} size="sm" />
                  <span className="font-medium text-servora-charcoal">{recipe.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{recipe.category}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {recipe.ingredients.length} items
              </td>
              <td className="px-4 py-3">
                {recipe.yieldResult.canMake ? (
                  <Badge variant="success">
                    {recipe.yieldResult.maxYield} {recipe.yieldUnit}
                  </Badge>
                ) : (
                  <Badge variant="danger">Cannot make</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {recipe.yieldResult.bottleneckIngredient ? (
                  <>
                    {recipe.yieldResult.bottleneckIngredient}
                    {recipe.yieldResult.bottleneckNote && (
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {recipe.yieldResult.bottleneckNote}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/recipes/${recipe.id}/edit#menu-image`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">
                      Photo
                    </Button>
                  </Link>
                  <Link href={`/recipes/${recipe.id}/edit`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    disabled={isPending}
                    onClick={() => handleDelete(recipe.id, recipe.name)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
