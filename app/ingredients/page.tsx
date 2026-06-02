import Link from "next/link";
import { getIngredientCategories, getIngredients } from "@/app/actions/ingredients";
import { IngredientsFilters } from "@/components/ingredients/IngredientsFilters";
import { IngredientSetup } from "@/components/ingredients/IngredientSetup";
import { IngredientTable } from "@/components/ingredients/IngredientTable";
import { Button } from "@/components/ui/Button";

type SearchParams = Promise<{
  search?: string;
  category?: string;
}>;

export const dynamic = "force-dynamic";

export default async function IngredientsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const [ingredients, categories] = await Promise.all([
    getIngredients({ search: filters.search, category: filters.category }),
    getIngredientCategories(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Ingredients</h1>
          <p className="text-sm text-gray-500">
            Master catalog with auto-generated barcodes for scanner input. Inventory attaches
            stock and pricing separately.
          </p>
        </div>
        <Link href="/ingredients/barcodes">
          <Button variant="secondary">View & print barcodes</Button>
        </Link>
      </div>

      <IngredientSetup />

      <IngredientsFilters categories={categories} />

      <IngredientTable ingredients={ingredients} />
    </div>
  );
}
