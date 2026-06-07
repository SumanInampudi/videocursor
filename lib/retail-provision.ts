import "server-only";

import type { Prisma } from "@prisma/client";
import { ProductType, Unit } from "@prisma/client";
import { generateIngredientBarcode, generateProductBarcode } from "@/lib/barcode";
import { ingredientSkuPrefix, normalizeIngredientName } from "@/lib/ingredients";

export type ProvisionRetailInput = {
  name: string;
  category: string;
  unit: Unit;
  salePrice?: number | null;
  quantityPerSale?: number;
  addToMenu: boolean;
};

export type ProvisionRetailResult = {
  ingredientId: string;
  inventoryItemId: string;
  name: string;
  sku: string;
  category: string;
  defaultUnit: Unit;
  productId: string | null;
  productCreated: boolean;
  createdIngredient: boolean;
  createdInventory: boolean;
};

async function nextIngredientSkuInTx(
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

async function nextPosCodeInTx(tx: Prisma.TransactionClient, businessId: string) {
  const agg = await tx.product.aggregate({
    where: { businessId, posCode: { not: null } },
    _max: { posCode: true },
  });
  return (agg._max.posCode ?? 0) + 1;
}

/**
 * Ensures raw material + inventory SKU exist; optionally creates a retail menu product.
 * Does not receive stock — caller adds qty via stock receive.
 */
export async function provisionRetailReceiveItem(
  tx: Prisma.TransactionClient,
  businessId: string,
  input: ProvisionRetailInput
): Promise<ProvisionRetailResult> {
  const trimmedName = input.name.trim();
  const normalizedName = normalizeIngredientName(trimmedName);
  if (!normalizedName) {
    throw new Error("Name is required");
  }

  let ingredient = await tx.ingredient.findFirst({
    where: { businessId, normalizedName },
  });
  let createdIngredient = false;

  if (!ingredient) {
    const sku = await nextIngredientSkuInTx(tx, trimmedName, businessId);
    ingredient = await tx.ingredient.create({
      data: {
        businessId,
        name: trimmedName,
        normalizedName,
        sku,
        barcode: generateIngredientBarcode(trimmedName),
        category: input.category.trim() || "Retail",
        defaultUnit: input.unit,
        isActive: true,
      },
    });
    createdIngredient = true;
  }

  let inventory = await tx.inventoryItem.findFirst({
    where: { businessId, ingredientId: ingredient.id },
  });
  let createdInventory = false;

  if (!inventory) {
    inventory = await tx.inventoryItem.create({
      data: {
        businessId,
        ingredientId: ingredient.id,
        name: ingredient.name,
        sku: `${ingredient.sku}-STK`,
        category: ingredient.category,
        quantity: 0,
        unit: input.unit,
        reorderLevel: 0,
        costPerUnit: 0,
        isActive: true,
      },
    });
    await tx.inventoryCostHistory.create({
      data: {
        inventoryItemId: inventory.id,
        costPerUnit: 0,
        previousCost: null,
        note: "Initial cost",
      },
    });
    createdInventory = true;
  }

  let productId: string | null = null;
  let productCreated = false;

  const shouldAddMenu =
    input.addToMenu && input.salePrice != null && input.salePrice >= 0;

  if (shouldAddMenu) {
    const existingProduct = await tx.product.findFirst({
      where: {
        businessId,
        retailInventoryItemId: inventory.id,
        productType: ProductType.RETAIL,
      },
      select: { id: true },
    });

    if (existingProduct) {
      productId = existingProduct.id;
      if (input.salePrice != null) {
        await tx.product.update({
          where: { id: existingProduct.id },
          data: { salePrice: input.salePrice },
        });
      }
    } else {
      const posCode = await nextPosCodeInTx(tx, businessId);
      const perSale = input.quantityPerSale ?? 1;
      const product = await tx.product.create({
        data: {
          businessId,
          name: trimmedName,
          category: ingredient.category,
          yieldQuantity: 1,
          yieldUnit: input.unit,
          salePrice: input.salePrice,
          posCode,
          barcode: generateProductBarcode(trimmedName),
          productType: ProductType.RETAIL,
          requiresKitchen: false,
          retailInventoryItemId: inventory.id,
          retailQuantityPerSale: perSale,
        },
      });
      productId = product.id;
      productCreated = true;
    }
  }

  return {
    ingredientId: ingredient.id,
    inventoryItemId: inventory.id,
    name: ingredient.name,
    sku: ingredient.sku,
    category: ingredient.category,
    defaultUnit: ingredient.defaultUnit,
    productId,
    productCreated,
    createdIngredient,
    createdInventory,
  };
}
