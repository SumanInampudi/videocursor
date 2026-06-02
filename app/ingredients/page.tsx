import Link from "next/link";
import { getIngredientCategories, getIngredients } from "@/app/actions/ingredients";
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

      <form className="mb-4 grid gap-3 filter-bar md:grid-cols-[1fr_220px_auto]">
        <input
          name="search"
          defaultValue={filters.search ?? ""}
          placeholder="Search name, SKU, barcode, category, or alias..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-servora-charcoal placeholder:text-gray-400 focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow"
        />
        <select
          name="category"
          defaultValue={filters.category ?? ""}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-servora-charcoal focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>

      <IngredientTable ingredients={ingredients} />
    </div>
  );
}
