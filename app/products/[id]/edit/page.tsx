import { notFound } from "next/navigation";
import {
  getActiveIngredientsForProducts,
  getInventoryItemsForRetailMenu,
  getPreparedProductsForInclusions,
  getProduct,
  getProductCategories,
  updateProduct,
} from "@/app/actions/products";
import { getProductPricingDetail } from "@/app/actions/pricing";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductMenuImageFields } from "@/components/products/ProductMenuImageFields";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, ingredients, inventoryItems, pricing, categories, inclusionCandidates] =
    await Promise.all([
      getProduct(id),
      getActiveIngredientsForProducts(),
      getInventoryItemsForRetailMenu(),
      getProductPricingDetail(id),
      getProductCategories(),
      getPreparedProductsForInclusions(id),
    ]);

  if (!product) notFound();

  const updateAction = updateProduct.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Edit product</h1>
        <p className="page-subtitle">Update {product.name}</p>
      </div>
      <ProductForm
        action={updateAction}
        ingredients={ingredients}
        inventoryItems={inventoryItems}
        initialData={{
          name: product.name,
          description: product.description,
          category: product.category,
          yieldQuantity: Number(product.yieldQuantity),
          yieldUnit: product.yieldUnit,
          salePrice: product.salePrice != null ? Number(product.salePrice) : null,
          posCode: product.posCode ?? null,
          prepTimeMinutes: product.prepTimeMinutes ?? null,
          instructions: product.instructions,
          productType: product.productType,
          requiresKitchen: product.requiresKitchen,
          retailInventoryItemId: product.retailInventoryItemId,
          retailQuantityPerSale:
            product.retailQuantityPerSale != null
              ? Number(product.retailQuantityPerSale)
              : null,
          ingredients: product.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })),
          inclusions: product.includedSides.map((row) => ({
            includedProductId: row.includedProductId,
            quantityPerParent: row.quantityPerParent,
          })),
        }}
        estimatedRawMaterialCostPerSale={pricing?.costEstimate?.unitIngredientCost ?? null}
        categories={categories}
        inclusionCandidates={inclusionCandidates}
        submitLabel="Update product"
      />
      <div className="mt-8">
        <ProductMenuImageFields productId={id} productName={product.name} imageUrl={product.imageUrl} />
      </div>
    </div>
  );
}
