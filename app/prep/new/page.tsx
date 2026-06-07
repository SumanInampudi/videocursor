import { getActiveIngredientsForProducts, getProductCategories } from "@/app/actions/products";
import { createPrepItem } from "@/app/actions/prep";
import { PrepForm } from "@/components/prep/PrepForm";

export const dynamic = "force-dynamic";

export default async function NewPrepPage() {
  const [ingredients, categories] = await Promise.all([
    getActiveIngredientsForProducts(),
    getProductCategories(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">New prep item</h1>
        <p className="page-subtitle">Define a batch recipe; output is stocked for use in dishes.</p>
      </div>
      <PrepForm
        action={createPrepItem}
        ingredients={ingredients}
        categories={categories}
        submitLabel="Create prep item"
      />
    </div>
  );
}
