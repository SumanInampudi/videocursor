import Link from "next/link";
import { getRecipes } from "@/app/actions/recipes";
import { RecipeTable } from "@/components/recipes/RecipeTable";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Recipes</h1>
          <p className="text-sm text-gray-500">
            Define bill of materials (BOM) to calculate how much food you can make
          </p>
        </div>
        <Link href="/recipes/new">
          <Button>Add Recipe</Button>
        </Link>
      </div>

      <RecipeTable recipes={recipes} />
    </div>
  );
}
