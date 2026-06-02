import { notFound } from "next/navigation";
import {
  getActiveIngredientsForRecipes,
  getInventoryItemsForRetailMenu,
  getRecipe,
  updateRecipe,
} from "@/app/actions/recipes";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { RecipeMenuImageFields } from "@/components/recipes/RecipeMenuImageFields";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params;
  const [recipe, ingredients, inventoryItems] = await Promise.all([
    getRecipe(id),
    getActiveIngredientsForRecipes(),
    getInventoryItemsForRetailMenu(),
  ]);

  if (!recipe) notFound();

  const updateAction = updateRecipe.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Edit menu item</h1>
        <p className="page-subtitle">Update {recipe.name}</p>
      </div>
      <RecipeForm
        action={updateAction}
        ingredients={ingredients}
        inventoryItems={inventoryItems}
        initialData={{
          name: recipe.name,
          description: recipe.description,
          category: recipe.category,
          yieldQuantity: Number(recipe.yieldQuantity),
          yieldUnit: recipe.yieldUnit,
          instructions: recipe.instructions,
          recipeType: recipe.recipeType,
          requiresKitchen: recipe.requiresKitchen,
          retailInventoryItemId: recipe.retailInventoryItemId,
          retailQuantityPerSale:
            recipe.retailQuantityPerSale != null
              ? Number(recipe.retailQuantityPerSale)
              : null,
          ingredients: recipe.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })),
        }}
        submitLabel="Update menu item"
      />
      <div className="mt-8">
        <RecipeMenuImageFields recipeId={id} recipeName={recipe.name} imageUrl={recipe.imageUrl} />
      </div>
    </div>
  );
}
