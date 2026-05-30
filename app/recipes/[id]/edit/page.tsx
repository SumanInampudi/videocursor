import { notFound } from "next/navigation";
import {
  getActiveInventoryForRecipes,
  getRecipe,
  updateRecipe,
} from "@/app/actions/recipes";
import { RecipeForm } from "@/components/recipes/RecipeForm";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function EditRecipePage({ params }: Props) {
  const [recipe, inventoryItems] = await Promise.all([
    getRecipe(params.id),
    getActiveInventoryForRecipes(),
  ]);

  if (!recipe) notFound();

  const updateAction = updateRecipe.bind(null, params.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Edit Recipe</h1>
        <p className="text-sm text-gray-500">Update recipe and ingredients for {recipe.name}</p>
      </div>
      <RecipeForm
        action={updateAction}
        inventoryItems={inventoryItems}
        initialData={{
          name: recipe.name,
          description: recipe.description,
          category: recipe.category,
          yieldQuantity: Number(recipe.yieldQuantity),
          yieldUnit: recipe.yieldUnit,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients.map((ing) => ({
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })),
        }}
        submitLabel="Update Recipe"
      />
    </div>
  );
}
