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
            Define bill of materials (BOM) to calculate how much food you can make.{" "}
            <Link href="/recipes/pricing" className="font-medium text-servora-yellow hover:underline">
              Recipe pricing
            </Link>{" "}
            and{" "}
            <span className="text-servora-charcoal">edit recipe → POS menu image</span> are where you
            upload photos for the register.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/recipes/barcodes">
            <Button variant="secondary">Barcodes</Button>
          </Link>
          <Link href="/recipes/pricing">
            <Button variant="secondary">Pricing</Button>
          </Link>
          <Link href="/recipes/new">
            <Button>Add Recipe</Button>
          </Link>
        </div>
      </div>

      <RecipeTable recipes={recipes} />
    </div>
  );
}
