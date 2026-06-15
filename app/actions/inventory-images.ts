"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;

export async function updateInventoryImageUrl(inventoryItemId: string, imageUrl: string) {
  const trimmed = imageUrl.trim();
  await db.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { imageUrl: trimmed || null },
  });
  revalidateInventoryPaths(inventoryItemId);
  return { success: true };
}

export async function uploadInventoryImage(inventoryItemId: string, formData: FormData) {
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
  const relativePath = `/uploads/inventory/${inventoryItemId}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "inventory");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", relativePath), Buffer.from(await file.arrayBuffer()));

  await db.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { imageUrl: relativePath },
  });
  revalidateInventoryPaths(inventoryItemId);
  return { success: true, imageUrl: relativePath };
}

export async function clearInventoryImage(inventoryItemId: string) {
  await db.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { imageUrl: null },
  });
  revalidateInventoryPaths(inventoryItemId);
  return { success: true };
}

function revalidateInventoryPaths(inventoryItemId: string) {
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${inventoryItemId}/edit`);
  revalidatePath("/inventory/receive");
  revalidatePath("/inventory/receive/history");
}

