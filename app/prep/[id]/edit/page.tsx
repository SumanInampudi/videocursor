import { notFound } from "next/navigation";
import { getActiveIngredientsForProducts, getProductCategories } from "@/app/actions/products";
import { getPrepItem, updatePrepItem } from "@/app/actions/prep";
import { PrepForm } from "@/components/prep/PrepForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditPrepPage({ params }: Props) {
  const { id } = await params;
  const [item, ingredients, categories] = await Promise.all([
    getPrepItem(id),
    getActiveIngredientsForProducts(),
    getProductCategories(),
  ]);

  if (!item) notFound();

  const updateAction = updatePrepItem.bind(null, id);
  const prep = item as {
    name: string;
    description: string | null;
    category: string;
    yieldQuantity: number | string;
    yieldUnit: string;
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
          instructions: prep.instructions,
          ingredients: prep.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })),
        }}
        submitLabel="Update prep item"
      />
    </div>
  );
}
