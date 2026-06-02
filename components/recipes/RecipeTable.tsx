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
  recipeType?: "PREPARED" | "RETAIL";
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
      <div className="empty-state">
        <p className="empty-state-text">No recipes found.</p>
        <Link href="/recipes/new" className="mt-4 inline-block">
          <Button>Create your first recipe</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="table-panel">
      <table>
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Category</th>
            <th>Ingredients</th>
            <th>Max Yield</th>
            <th>Bottleneck</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((recipe) => (
            <tr key={recipe.id}>
              <td>
                <div className="flex items-center gap-3">
                  <RecipeThumbnail name={recipe.name} imageUrl={recipe.imageUrl} size="sm" />
                  <span className="font-semibold text-charcoal">{recipe.name}</span>
                  {recipe.recipeType === "RETAIL" && (
                    <Badge variant="primary" className="ml-1 normal-case">
                      Retail
                    </Badge>
                  )}
                </div>
              </td>
              <td className="text-charcoal-muted">{recipe.category}</td>
              <td className="text-charcoal-muted">
                {recipe.recipeType === "RETAIL"
                  ? "Retail item"
                  : `${recipe.ingredients.length} items`}
              </td>
              <td>
                {recipe.yieldResult.canMake ? (
                  <Badge variant="success">
                    {recipe.yieldResult.maxYield} {recipe.yieldUnit}
                  </Badge>
                ) : (
                  <Badge variant="danger">Cannot make</Badge>
                )}
              </td>
              <td className="text-charcoal-muted">
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
              <td className="text-right">
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
