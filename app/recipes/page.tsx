import Link from "next/link";
import { getRecipes } from "@/app/actions/recipes";
import { RecipeTable } from "@/components/recipes/RecipeTable";
import { Button } from "@/components/ui/Button";
import { LiveSearchBar } from "@/components/ui/LiveSearchBar";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function RecipesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const recipes = await getRecipes(params.q);

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle={
          <>
            Prepared dishes use a BOM. Retail items (Coke, packaged snacks) resell inventory
            directly — no kitchen prep.{" "}
            <Link href="/recipes/pricing" className="link-brand">
              Recipe pricing
            </Link>{" "}
            · upload POS menu photos when editing a item.
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
      <div className="mb-4 max-w-md">
        <LiveSearchBar placeholder="Search recipe name, category, barcode..." />
      </div>

      <RecipeTable recipes={recipes} />
    </div>
  );
}
