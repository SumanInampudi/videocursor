import "server-only";

import type { Prisma } from "@prisma/client";
import { Unit } from "@prisma/client";
import { generateIngredientBarcode } from "@/lib/barcode";
import { ingredientSkuPrefix, normalizeIngredientName } from "@/lib/ingredients";
import { UNITS } from "@/lib/units";

function toInventoryUnit(yieldUnit: string): Unit {
  const lower = yieldUnit.trim().toLowerCase();
  const match = UNITS.find((u) => u.toLowerCase() === lower);
  return (match ?? "g") as Unit;
}

async function nextIngredientSku(
  tx: Prisma.TransactionClient,
  name: string,
  businessId: string
) {
  const prefix = ingredientSkuPrefix(name);
  const existing = await tx.ingredient.findMany({
    where: { businessId, sku: { startsWith: prefix } },
    select: { sku: true },
  });
  const used = new Set(existing.map((item) => item.sku));
  let index = 1;
  let sku = `${prefix}-${String(index).padStart(3, "0")}`;
  while (used.has(sku)) {
    index += 1;
    sku = `${prefix}-${String(index).padStart(3, "0")}`;
  }
  return sku;
}

/** Creates raw material + zero-qty inventory SKU for prep batch output. */
export async function createPrepOutputStock(
  tx: Prisma.TransactionClient,
  businessId: string,
  input: { name: string; category: string; yieldUnit: string }
): Promise<string> {
  const normalizedName = normalizeIngredientName(input.name);
  const unit = toInventoryUnit(input.yieldUnit);

  let ingredient = await tx.ingredient.findFirst({
    where: { businessId, normalizedName },
    select: { id: true, name: true, sku: true, category: true, defaultUnit: true },
  });

  if (!ingredient) {
    const sku = await nextIngredientSku(tx, input.name, businessId);
    ingredient = await tx.ingredient.create({
      data: {
        businessId,
        name: input.name.trim(),
        normalizedName,
        sku,
        barcode: generateIngredientBarcode(input.name),
        category: input.category.trim() || "Prep",
        defaultUnit: unit,
        isActive: true,
      },
      select: { id: true, name: true, sku: true, category: true, defaultUnit: true },
    });
  }

  const existingItem = await tx.inventoryItem.findFirst({
    where: { businessId, ingredientId: ingredient.id },
    select: { id: true },
  });
  if (existingItem) return existingItem.id;

  const item = await tx.inventoryItem.create({
    data: {
      businessId,
      ingredientId: ingredient.id,
      name: ingredient.name,
      sku: `${ingredient.sku}-PREP`,
      category: ingredient.category,
      quantity: 0,
      unit: ingredient.defaultUnit,
      reorderLevel: 0,
      costPerUnit: 0,
      isActive: true,
    },
  });

  return item.id;
}
