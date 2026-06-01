"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { inventoryItemSchema } from "@/lib/validations";
import { Prisma, Unit } from "@prisma/client";

async function recordCostHistory(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  costPerUnit: number,
  previousCost: number | null,
  note?: string
) {
  await tx.inventoryCostHistory.create({
    data: {
      inventoryItemId,
      costPerUnit,
      previousCost,
      note: note ?? null,
    },
  });
}

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

  return serializeForClient(filtered);
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
  const item = await db.inventoryItem.findUnique({ where: { id } });
  return item ? serializeForClient(item) : null;
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
    await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
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
      await recordCostHistory(tx, item.id, data.costPerUnit, null, "Initial cost");
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
    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return { error: { name: ["Item not found"] } };
    }

    const previousCost = Number(existing.costPerUnit);
    const costChanged = previousCost !== data.costPerUnit;

    await db.$transaction(async (tx) => {
      await tx.inventoryItem.update({
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

      if (costChanged) {
        await recordCostHistory(
          tx,
          id,
          data.costPerUnit,
          previousCost,
          "Updated from inventory form"
        );
      }
    });
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}/edit`);
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

export async function getInventorySummary() {
  const items = await db.inventoryItem.findMany();
  const activeItems = items.filter((item) => item.isActive);

  const lowStockCount = activeItems.filter(
    (item) => Number(item.quantity) <= Number(item.reorderLevel)
  ).length;

  const totalStockValue = activeItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.costPerUnit),
    0
  );

  const openCredit = await db.inventoryPurchase.findMany({
    where: { paymentStatus: { in: ["CREDIT", "PARTIAL"] } },
    select: { totalAmount: true, amountPaid: true },
  });
  const creditPurchaseCount = openCredit.length;
  const totalPayables = openCredit.reduce(
    (sum, p) => sum + Math.max(0, Number(p.totalAmount) - Number(p.amountPaid)),
    0
  );

  return {
    totalItems: items.length,
    activeItems: activeItems.length,
    lowStockCount,
    totalStockValue,
    totalPayables,
    creditPurchaseCount,
  };
}

export async function getDashboardStats() {
  const summary = await getInventorySummary();
  const recipeCount = await db.recipe.count();

  return {
    totalItems: summary.activeItems,
    lowStockCount: summary.lowStockCount,
    totalValue: summary.totalStockValue,
    recipeCount,
  };
}
