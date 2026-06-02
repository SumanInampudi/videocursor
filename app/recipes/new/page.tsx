import { createRecipe, getActiveIngredientsForRecipes, getInventoryItemsForRetailMenu } from "@/app/actions/recipes";
import { RecipeForm } from "@/components/recipes/RecipeForm";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const [ingredients, inventoryItems] = await Promise.all([
    getActiveIngredientsForRecipes(),
    getInventoryItemsForRetailMenu(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Create menu item</h1>
        <p className="page-subtitle">
          Prepared dishes use a bill of materials. Retail items (Coke, snacks) link straight to
          inventory stock.
        </p>
      </div>
      <RecipeForm
        action={createRecipe}
        ingredients={ingredients}
        inventoryItems={inventoryItems}
        submitLabel="Create menu item"
      />
    </div>
  );
}
