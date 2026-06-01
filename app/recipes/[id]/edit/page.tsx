import { notFound } from "next/navigation";
import {
  getActiveIngredientsForRecipes,
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
  const [recipe, ingredients] = await Promise.all([
    getRecipe(id),
    getActiveIngredientsForRecipes(),
  ]);

  if (!recipe) notFound();

  const updateAction = updateRecipe.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Edit Recipe</h1>
        <p className="text-sm text-gray-500">Update recipe and ingredients for {recipe.name}</p>
      </div>
      <RecipeForm
        action={updateAction}
        ingredients={ingredients}
        initialData={{
          name: recipe.name,
          description: recipe.description,
          category: recipe.category,
          yieldQuantity: Number(recipe.yieldQuantity),
          yieldUnit: recipe.yieldUnit,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired),
            unit: ing.unit,
          })),
        }}
        submitLabel="Update Recipe"
      />
      <RecipeMenuImageFields
        recipeId={recipe.id}
        recipeName={recipe.name}
        imageUrl={recipe.imageUrl}
      />
    </div>
  );
}
