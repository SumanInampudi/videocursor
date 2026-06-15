import { notFound } from "next/navigation";
import { getActiveIngredientsForProducts, getProductCategories } from "@/app/actions/products";
import { getPrepItem, updatePrepItem } from "@/app/actions/prep";
import { getPrepSellVariants } from "@/app/actions/prep-variants";
import { PrepForm } from "@/components/prep/PrepForm";
import { PrepSellVariantsPanel } from "@/components/prep/PrepSellVariantsPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditPrepPage({ params }: Props) {
  const { id } = await params;
  const [item, ingredients, categories, sellVariants] = await Promise.all([
    getPrepItem(id),
    getActiveIngredientsForProducts(),
    getProductCategories(),
    getPrepSellVariants(id),
  ]);

  if (!item) notFound();

  const updateAction = updatePrepItem.bind(null, id);
  const prep = item as {
    name: string;
    description: string | null;
    category: string;
    yieldQuantity: number | string;
    yieldUnit: string;
    inclusionOutputQuantity: number | string | null;
    instructions: string | null;
    ingredients: { ingredientId: string; quantityRequired: number | string; unit: string }[];
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Edit prep item</h1>
        <p className="page-subtitle">{prep.name}</p>
      </div>
      <PrepForm
        action={updateAction}
        ingredients={ingredients}
        categories={categories}
        initialData={{
          name: prep.name,
          description: prep.description,
          category: prep.category,
          yieldQuantity: Number(prep.yieldQuantity),
          yieldUnit: prep.yieldUnit,
          inclusionOutputQuantity:
            prep.inclusionOutputQuantity != null ? Number(prep.inclusionOutputQuantity) : null,
          instructions: prep.instructions,
          ingredients: prep.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })),
        }}
        submitLabel="Update prep item"
      />
      <PrepSellVariantsPanel
        prepId={sellVariants.prepId}
        prepName={sellVariants.prepName}
        yieldUnit={sellVariants.yieldUnit}
        onHandQty={sellVariants.onHandQty}
        variants={sellVariants.variants}
      />
    </div>
  );
}
