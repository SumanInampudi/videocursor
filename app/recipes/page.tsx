import Link from "next/link";
import { getRecipes } from "@/app/actions/recipes";
import { RecipeTable } from "@/components/recipes/RecipeTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle={
          <>
            Define bill of materials (BOM). &quot;Can make&quot; uses usable stock after wastage.{" "}
            <Link href="/recipes/pricing" className="link-brand">
              Recipe pricing
            </Link>{" "}
            · upload POS menu photos when editing a recipe.
          </>
        }
        actions={
          <>
            <Link href="/recipes/barcodes">
              <Button variant="outline">Barcodes</Button>
            </Link>
            <Link href="/recipes/pricing">
              <Button variant="secondary">Pricing</Button>
            </Link>
            <Link href="/recipes/new">
              <Button>Add Recipe</Button>
            </Link>
          </>
        }
      />

      <RecipeTable recipes={recipes} />
    </div>
  );
}
