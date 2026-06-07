"use server";

import { revalidatePath } from "next/cache";
import { mergeUniqueCategories, resolveCategory } from "@/lib/category-resolve";
import { db } from "@/lib/db";
import {
  applyFifoConsumptions,
  applyManualInventoryCostUpdate,
  createCostLayer,
  planFifoConsumption,
} from "@/lib/inventory-fifo";
import { recordManualInventoryAdjustment } from "@/lib/inventory-adjustment-log";
import { serializeForClient } from "@/lib/serialize";
import { smartMatches } from "@/lib/smart-search";
import { resolveInventoryUnit } from "@/lib/ingredient-unit";
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
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const items = await db.inventoryItem.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    include: {
      ingredient: { select: { wastagePercent: true } },
    },
  });

  let filtered = items;

  if (filters?.search) {
    const searchTerm = filters.search;
    filtered = filtered.filter(
      (item) =>
        smartMatches(
          [item.name, item.sku, item.category, item.description, item.supplier],
          searchTerm
        )
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

  return serializeForClient(filtered) as (Prisma.InventoryItemGetPayload<{
    include: { ingredient: { select: { wastagePercent: true } } };
  }> & { ingredient: { wastagePercent: number } | null })[];
}

export async function getInventoryCategories() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const items = await db.inventoryItem.findMany({
    where: { businessId },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return items.map((item) => item.category);
}

/** Raw material + inventory categories for stock item forms. */
export async function getInventoryCatalogCategories() {
  const { getRawMaterialCategories } = await import("@/app/actions/raw-materials");
  const [rawMaterialCategories, inventoryCategories] = await Promise.all([
    getRawMaterialCategories(),
    getInventoryCategories(),
  ]);
  return mergeUniqueCategories(rawMaterialCategories, inventoryCategories);
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

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const existingCategories = await getInventoryCatalogCategories();
  const categoryResult = resolveCategory(data.category, existingCategories);
  if (!categoryResult.ok) {
    return { error: { category: [categoryResult.message] } };
  }
  data.category = categoryResult.category;
  data.unit = await resolveInventoryUnit(
    businessId,
    data.ingredientId || null,
    data.unit
  );

  try {
    await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          businessId,
          name: data.name,
          ingredientId: data.ingredientId || null,
          sku: data.sku,
          category: data.category,
          imageUrl: data.imageUrl?.trim() || null,
          description: data.description || null,
          notes: data.notes || null,
          quantity: data.quantity,
          unit: data.unit as Unit,
          reorderLevel: data.reorderLevel,
          costPerUnit: data.costPerUnit,
          supplierId: data.supplierId || null,
          supplier: data.supplier || null,
          storageLocation: data.storageLocation || null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          batchNumber: data.batchNumber || null,
          isActive: data.isActive,
        },
      });
      await recordCostHistory(tx, item.id, data.costPerUnit, null, "Initial cost");
      if (data.quantity > 0) {
        await createCostLayer(tx, {
          inventoryItemId: item.id,
          quantity: data.quantity,
          unit: data.unit as Unit,
          costPerUnit: data.costPerUnit,
        });
      }
    });
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }

  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/products");
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

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const existingCategories = await getInventoryCatalogCategories();
  const categoryResult = resolveCategory(data.category, existingCategories);
  if (!categoryResult.ok) {
    return { error: { category: [categoryResult.message] } };
  }
  data.category = categoryResult.category;

  try {
    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return { error: { name: ["Item not found"] } };
    }

    data.unit = await resolveInventoryUnit(
      businessId,
      data.ingredientId || existing.ingredientId,
      data.unit
    );

    const previousCost = Number(existing.costPerUnit);
    const previousQty = Number(existing.quantity);
    const costChanged = Math.abs(previousCost - data.costPerUnit) > 0.0001;
    const qtyChanged = Math.abs(previousQty - data.quantity) > 0.0001;

    await db.$transaction(async (tx) => {
      const qtyDelta = data.quantity - previousQty;
      const itemFields = {
        name: data.name,
        ingredientId: data.ingredientId || null,
        sku: data.sku,
        category: data.category,
        imageUrl: data.imageUrl?.trim() || null,
        description: data.description || null,
        notes: data.notes || null,
        unit: data.unit as Unit,
        reorderLevel: data.reorderLevel,
        supplierId: data.supplierId || null,
        supplier: data.supplier || null,
        storageLocation: data.storageLocation || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber || null,
        isActive: data.isActive,
      };

      if (qtyDelta < -0.0001) {
        await tx.inventoryItem.update({
          where: { id },
          data: { ...itemFields, quantity: previousQty },
        });
        const layers = await tx.inventoryCostLayer.findMany({
          where: { inventoryItemId: id, quantityRemaining: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });
        const plan = planFifoConsumption({
          needed: -qtyDelta,
          unit: data.unit as Unit,
          wastagePercent: 0,
          inventoryItems: [
            {
              id,
              quantity: previousQty,
              unit: data.unit as Unit,
              costPerUnit: previousCost,
              isActive: true,
              costLayers: layers.map((l) => ({
                id: l.id,
                quantityRemaining: Number(l.quantityRemaining),
                costPerUnit: Number(l.costPerUnit),
                unit: l.unit,
              })),
            },
          ],
        });
        if (plan.ok) {
          await applyFifoConsumptions(tx, plan.consumptions);
        }
      } else {
        await tx.inventoryItem.update({
          where: { id },
          data: { ...itemFields, quantity: data.quantity },
        });
      }

      const costResult = await applyManualInventoryCostUpdate(tx, {
        inventoryItemId: id,
        previousQty: qtyDelta > 0.0001 ? previousQty : data.quantity,
        previousCost,
        newQty: data.quantity,
        newCost: data.costPerUnit,
        unit: data.unit as Unit,
      });

      if (costChanged || qtyDelta > 0.0001) {
        await recordCostHistory(
          tx,
          id,
          costResult.costPerUnit,
          previousCost,
          costResult.note ?? "Updated from inventory form"
        );
      }

      if (qtyChanged || costChanged) {
        await recordManualInventoryAdjustment(tx, {
          inventoryItemId: id,
          itemName: data.name,
          unit: data.unit as Unit,
          previousQty,
          newQty: data.quantity,
          previousCost,
          newCost: costResult.costPerUnit,
          supplierId: data.supplierId || null,
          supplierName: data.supplier || null,
        });
      }
    });
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}/edit`);
  revalidatePath("/inventory/receive/history");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/products");
  return { success: true };
}

export async function deleteInventoryItem(id: string) {
  const inUse = await db.productIngredient.count({
    where: { inventoryItemId: id },
  });

  if (inUse > 0) {
    return { error: "Cannot delete item used in products. Deactivate it instead." };
  }

  await db.inventoryItem.delete({ where: { id } });

  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/yield");
  revalidatePath("/products");
  return { success: true };
}

export async function getInventorySummary() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const items = await db.inventoryItem.findMany({ where: { businessId } });
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
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const summary = await getInventorySummary();
  const productCount = await db.product.count({ where: { businessId } });

  return {
    totalItems: summary.activeItems,
    lowStockCount: summary.lowStockCount,
    totalValue: summary.totalStockValue,
    productCount,
  };
}
