"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { uploadRecipeImage } from "@/app/actions/recipe-images";
import { RecipeThumbnail } from "@/components/recipes/RecipeThumbnail";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

type RecipeImageUploadCompactProps = {
  recipeId: string;
  recipeName: string;
  imageUrl: string | null;
};

/** Small thumbnail + upload for pricing / list views. */
export function RecipeImageUploadCompact({
  recipeId,
  recipeName,
  imageUrl,
}: RecipeImageUploadCompactProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await uploadRecipeImage(recipeId, formData);
      if (result.error) toastError(result.error);
      else {
        success("Menu image updated");
        router.refresh();
      }
      e.target.value = "";
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <RecipeThumbnail name={recipeName} imageUrl={imageUrl} size="lg" />
      <label className="cursor-pointer text-center">
        <span className="text-xs font-medium link-brand">
          {isPending ? "Uploading…" : imageUrl ? "Change photo" : "Add photo"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={isPending}
          onChange={handleUpload}
        />
      </label>
      <Link
        href={`/recipes/${recipeId}/edit`}
        className="text-[10px] text-gray-400 hover:text-gray-600"
      >
        or URL on edit →
      </Link>
    </div>
  );
}
