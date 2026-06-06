import {
  createProduct,
  getActiveIngredientsForProducts,
  getInventoryItemsForRetailMenu,
  getProductCategories,
} from "@/app/actions/products";
import { ProductForm } from "@/components/products/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [ingredients, inventoryItems, categories] = await Promise.all([
    getActiveIngredientsForProducts(),
    getInventoryItemsForRetailMenu(),
    getProductCategories(),
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
        submitLabel="Create product"
      />
    </div>
  );
}
