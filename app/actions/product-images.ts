"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;

export async function updateProductImageUrl(productId: string, imageUrl: string) {
  const trimmed = imageUrl.trim();
  await db.product.update({
    where: { id: productId },
    data: { imageUrl: trimmed || null },
  });
  revalidateProductPaths(productId);
  return { success: true };
}

export async function uploadProductImage(productId: string, formData: FormData) {
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
  const relativePath = `/uploads/products/${productId}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", relativePath), Buffer.from(await file.arrayBuffer()));

  await db.product.update({
    where: { id: productId },
    data: { imageUrl: relativePath },
  });
  revalidateProductPaths(productId);
  return { success: true, imageUrl: relativePath };
}

export async function clearProductImage(productId: string) {
  await db.product.update({
    where: { id: productId },
    data: { imageUrl: null },
  });
  revalidateProductPaths(productId);
  return { success: true };
}

function revalidateProductPaths(productId: string) {
  revalidatePath("/products");
  revalidatePath(`/products/${productId}/edit`);
  revalidatePath("/orders/pos");
  revalidatePath("/products/pricing");
}
