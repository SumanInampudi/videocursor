"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { inventoryItemSchema } from "@/lib/validations";
import { Unit } from "@prisma/client";

export async function getInventoryItems(filters?: {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}) {
  const items = await db.inventoryItem.findMany({
    orderBy: { updatedAt: "desc" },
  });

  let filtered = items;

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
    );
  }

  if (filters?.category) {
    filtered = filtered.filter((item) => item.category === filters.category);
  }

  if (filters?.lowStockOnly) {
    filtered = filtered.filter(
      (item) => Number(item.quantity) <= Number(item.reorderLevel)
    );
  }

  return filtered;
}

export async function getInventoryCategories() {
  const items = await db.inventoryItem.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return items.map((item) => item.category);
}

export async function getInventoryItem(id: string) {
  return db.inventoryItem.findUnique({ where: { id } });
}

export async function createInventoryItem(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inventoryItemSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await db.inventoryItem.create({
      data: {
        name: data.name,
        ingredientId: data.ingredientId || null,
        sku: data.sku,
        category: data.category,
        description: data.description || null,
        notes: data.notes || null,
        quantity: data.quantity,
        unit: data.unit as Unit,
        reorderLevel: data.reorderLevel,
        costPerUnit: data.costPerUnit,
        supplier: data.supplier || null,
        storageLocation: data.storageLocation || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber || null,
        isActive: data.isActive,
      },
    });
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }

  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/recipes");
  return { success: true };
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inventoryItemSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await db.inventoryItem.update({
      where: { id },
      data: {
        name: data.name,
        ingredientId: data.ingredientId || null,
        sku: data.sku,
        category: data.category,
        description: data.description || null,
        notes: data.notes || null,
        quantity: data.quantity,
        unit: data.unit as Unit,
        reorderLevel: data.reorderLevel,
        costPerUnit: data.costPerUnit,
        supplier: data.supplier || null,
        storageLocation: data.storageLocation || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber || null,
        isActive: data.isActive,
      },
    });
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }

  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/recipes");
  return { success: true };
}

export async function deleteInventoryItem(id: string) {
  const inUse = await db.recipeIngredient.count({
    where: { inventoryItemId: id },
  });

  if (inUse > 0) {
    return { error: "Cannot delete item used in recipes. Deactivate it instead." };
  }

  await db.inventoryItem.delete({ where: { id } });

  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/recipes");
  return { success: true };
}

export async function getDashboardStats() {
  const items = await db.inventoryItem.findMany({
    where: { isActive: true },
  });

  const lowStockCount = items.filter(
    (item) => Number(item.quantity) <= Number(item.reorderLevel)
  ).length;

  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.costPerUnit),
    0
  );

  const recipeCount = await db.recipe.count();

  return {
    totalItems: items.length,
    lowStockCount,
    totalValue,
    recipeCount,
  };
}
