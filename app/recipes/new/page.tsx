import { createRecipe, getActiveIngredientsForRecipes } from "@/app/actions/recipes";
import { RecipeForm } from "@/components/recipes/RecipeForm";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const ingredients = await getActiveIngredientsForRecipes();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Create Recipe</h1>
        <p className="text-sm text-gray-500">
          Link inventory ingredients to calculate production yield
        </p>
      </div>
      <RecipeForm
        action={createRecipe}
        ingredients={ingredients}
        submitLabel="Create Recipe"
      />
    </div>
  );
}
