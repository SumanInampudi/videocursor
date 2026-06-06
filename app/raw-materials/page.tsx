import { listRawMaterialCategories, listRawMaterials } from "@/app/actions/raw-materials";
import { RawMaterialsFilters } from "@/components/raw-materials/RawMaterialsFilters";
import { RawMaterialSetup } from "@/components/raw-materials/RawMaterialSetup";
import { RawMaterialTable } from "@/components/raw-materials/RawMaterialTable";

type SearchParams = Promise<{
  search?: string;
  category?: string;
}>;

export const dynamic = "force-dynamic";

export default async function RawMaterialsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const [ingredients, categories] = await Promise.all([
    listRawMaterials({ search: filters.search, category: filters.category }),
    listRawMaterialCategories(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Raw Materials</h1>
          <p className="text-sm text-gray-500">
            Master catalog for stock inputs across any business. Inventory attaches stock and pricing
            separately.
          </p>
        </div>
      </div>

      <RawMaterialSetup categories={categories} />

      <RawMaterialsFilters categories={categories} />

      <RawMaterialTable ingredients={ingredients} categories={categories} />
    </div>
  );
}

