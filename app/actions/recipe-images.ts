"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;

export async function updateRecipeImageUrl(recipeId: string, imageUrl: string) {
  const trimmed = imageUrl.trim();
  await db.recipe.update({
    where: { id: recipeId },
    data: { imageUrl: trimmed || null },
  });
  revalidateRecipePaths(recipeId);
  return { success: true };
}

export async function uploadRecipeImage(recipeId: string, formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 2 MB" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image" };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const relativePath = `/uploads/recipes/${recipeId}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "recipes");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", relativePath), Buffer.from(await file.arrayBuffer()));

  await db.recipe.update({
    where: { id: recipeId },
    data: { imageUrl: relativePath },
  });
  revalidateRecipePaths(recipeId);
  return { success: true, imageUrl: relativePath };
}

export async function clearRecipeImage(recipeId: string) {
  await db.recipe.update({
    where: { id: recipeId },
    data: { imageUrl: null },
  });
  revalidateRecipePaths(recipeId);
  return { success: true };
}

function revalidateRecipePaths(recipeId: string) {
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}/edit`);
  revalidatePath("/orders/pos");
  revalidatePath("/recipes/pricing");
}
