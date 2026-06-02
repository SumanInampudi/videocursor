import Link from "next/link";
import { getRecipesWithPricing } from "@/app/actions/pricing";
import { RecipePricingTable } from "@/components/recipes/RecipePricingTable";
import { Button } from "@/components/ui/Button";
import { LiveSearchBar } from "@/components/ui/LiveSearchBar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function RecipePricingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const recipes = await getRecipesWithPricing(params.q);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Recipe pricing</h1>
          <p className="text-sm text-gray-500">
            Set sale prices, prep time, and menu photos. Ingredient cost uses FIFO stock layers
            and ingredient wastage % (higher waste → higher cost per plate).
          </p>
        </div>
        <Link href="/recipes">
          <Button variant="secondary">Back to recipes</Button>
        </Link>
      </div>
      <div className="mb-4 max-w-md">
        <LiveSearchBar placeholder="Search recipe pricing by name, category, barcode..." />
      </div>

      <RecipePricingTable recipes={recipes} />
    </div>
  );
}
