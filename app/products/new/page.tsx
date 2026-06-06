import {
  createProduct,
  getActiveIngredientsForProducts,
  getInventoryItemsForRetailMenu,
  getPreparedProductsForInclusions,
  getProductCategories,
  getSuggestedPosCode,
} from "@/app/actions/products";
import { ProductForm } from "@/components/products/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [ingredients, inventoryItems, categories, inclusionCandidates, suggestedPosCode] =
    await Promise.all([
      getActiveIngredientsForProducts(),
      getInventoryItemsForRetailMenu(),
      getProductCategories(),
      getPreparedProductsForInclusions(),
      getSuggestedPosCode(),
    ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Create product</h1>
        <p className="page-subtitle">
          Prepared dishes use a bill of materials. Retail items (Coke, snacks) link straight to
          inventory stock.
        </p>
      </div>
      <ProductForm
        action={createProduct}
        ingredients={ingredients}
        inventoryItems={inventoryItems}
        categories={categories}
        inclusionCandidates={inclusionCandidates}
        suggestedPosCode={suggestedPosCode}
        submitLabel="Create product"
      />
    </div>
  );
}
