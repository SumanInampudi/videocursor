import Link from "next/link";
import { getRecipesWithPricing } from "@/app/actions/pricing";
import { RecipePricingTable } from "@/components/recipes/RecipePricingTable";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function RecipePricingPage() {
  const recipes = await getRecipesWithPricing();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Recipe pricing</h1>
          <p className="text-sm text-gray-500">
            Set sale prices, prep time, and menu photos. Ingredient cost uses FIFO stock layers
            and ingredient wastage % (higher waste → higher cost per plate).
          </p>
        </div>
        <Link href="/recipes">
          <Button variant="secondary">Back to recipes</Button>
        </Link>
      </div>

      <RecipePricingTable recipes={recipes} />
    </div>
  );
}
