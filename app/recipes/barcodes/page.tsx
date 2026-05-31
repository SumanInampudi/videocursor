import Link from "next/link";
import { getRecipesForOrdering } from "@/app/actions/orders";
import { RecipeBarcodeGrid } from "@/components/recipes/RecipeBarcodeGrid";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function RecipeBarcodesPage() {
  const recipes = await getRecipesForOrdering();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/recipes" className="text-sm text-servora-yellow hover:underline">
            ← Back to recipes
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Recipe barcodes</h1>
          <p className="text-sm text-gray-500">
            Print labels for your menu items. Scan at{" "}
            <Link href="/orders/new" className="text-servora-yellow hover:underline">
              place order
            </Link>{" "}
            to add items quickly (prefix 2).
          </p>
        </div>
        <Link href="/orders/new">
          <Button>Place order</Button>
        </Link>
      </div>
      <RecipeBarcodeGrid recipes={recipes} />
    </div>
  );
}
