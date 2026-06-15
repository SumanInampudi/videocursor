import { listRawMaterialCategories, listRawMaterials } from "@/app/actions/raw-materials";
import { RawMaterialsView } from "@/components/raw-materials/RawMaterialsView";

export const dynamic = "force-dynamic";

export default async function RawMaterialsPage() {
  const [ingredients, categories] = await Promise.all([
    listRawMaterials(),
    listRawMaterialCategories(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Raw Materials</h1>
        <p className="text-sm text-gray-500">
          Master catalog for stock inputs. Inventory and pricing attach separately when you receive
          stock.
        </p>
      </div>

      <RawMaterialsView ingredients={ingredients} categories={categories} />
    </div>
  );
}
