"use server";

import { revalidatePath } from "next/cache";
import { generateProductBarcode } from "@/lib/barcode";
import { db } from "@/lib/db";
import { PREP_VARIANT_TEMPLATE_SET } from "@/lib/prep-variant-templates";
import { serializeForClient } from "@/lib/serialize";
import { ProductType, Unit } from "@prisma/client";

const VARIANT_PATHS = [
  "/prep",
  "/products",
  "/orders/pos",
  "/yield",
  "/",
];

function revalidateVariantPaths() {
  for (const p of VARIANT_PATHS) revalidatePath(p);
}

async function assertPosCodeAvailable(
  businessId: string,
  posCode: number | null,
  excludeProductId?: string
): Promise<string | null> {
  if (posCode == null) return null;
  const existing = await db.product.findFirst({
    where: {
      businessId,
      posCode,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { name: true },
  });
  if (existing) return `POS code ${posCode} is already used by "${existing.name}"`;
  return null;
}

async function loadPrepForVariants(prepId: string, businessId: string) {
  return db.product.findFirst({
    where: { id: prepId, businessId, productType: ProductType.PREP },
    include: {
      prepOutputInventoryItem: {
        select: {
          id: true,
          ingredientId: true,
          unit: true,
          ingredient: { select: { id: true, defaultUnit: true } },
        },
      },
    },
  });
}

export async function getPrepSellVariants(prepId: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const variants = await db.product.findMany({
    where: { businessId, parentPrepId: prepId, productType: ProductType.PREPARED },
    select: {
      id: true,
      name: true,
      variantLabel: true,
      variantSortOrder: true,
      variantOutputQuantity: true,
      salePrice: true,
      posCode: true,
      yieldUnit: true,
    },
    orderBy: [{ variantSortOrder: "asc" }, { variantLabel: "asc" }],
  });

  const prep = await loadPrepForVariants(prepId, businessId);
  const onHandQty =
    prep?.prepOutputInventoryItem != null
      ? Number(
          (
            await db.inventoryItem.findUnique({
              where: { id: prep.prepOutputInventoryItem.id },
              select: { quantity: true },
            })
          )?.quantity ?? 0
        )
      : 0;

  return serializeForClient({
    prepId,
    prepName: prep?.name ?? "",
    yieldUnit: prep?.yieldUnit ?? "KG",
    onHandQty,
    variants: variants.map((v) => ({
      ...v,
      salePrice: v.salePrice != null ? Number(v.salePrice) : null,
      variantOutputQuantity:
        v.variantOutputQuantity != null ? Number(v.variantOutputQuantity) : null,
    })),
  });
}

type VariantInput = {
  id?: string;
  variantLabel: string;
  variantOutputQuantity: number;
  salePrice: number;
  posCode?: number | null;
  variantSortOrder?: number;
};

export async function savePrepSellVariant(
  prepId: string,
  input: VariantInput
): Promise<{ success?: boolean; error?: string; variantId?: string }> {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const label = input.variantLabel.trim();
  if (!label) return { error: "Variant name is required" };
  if (input.variantOutputQuantity <= 0) return { error: "Output quantity must be greater than 0" };
  if (input.salePrice < 0) return { error: "Sale price cannot be negative" };

  const prep = await loadPrepForVariants(prepId, businessId);
  if (!prep) return { error: "Prep item not found" };
  const outputItem = prep.prepOutputInventoryItem;
  const ingredientId = outputItem?.ingredientId;
  if (!ingredientId || !outputItem) {
    return { error: "Prep item has no output stock — save the prep recipe first" };
  }

  const posConflict = await assertPosCodeAvailable(
    businessId,
    input.posCode ?? null,
    input.id
  );
  if (posConflict) return { error: posConflict };

  const productName = `${prep.name} — ${label}`;
  const unit = outputItem.ingredient?.defaultUnit ?? outputItem.unit;
  const sortOrder = input.variantSortOrder ?? 0;

  if (input.id) {
    const existing = await db.product.findFirst({
      where: { id: input.id, businessId, parentPrepId: prepId },
    });
    if (!existing) return { error: "Variant not found" };

    await db.$transaction(async (tx) => {
      await tx.productIngredient.deleteMany({ where: { productId: input.id! } });
      await tx.product.update({
        where: { id: input.id },
        data: {
          name: productName,
          variantLabel: label,
          variantSortOrder: sortOrder,
          variantOutputQuantity: input.variantOutputQuantity,
          salePrice: input.salePrice,
          posCode: input.posCode ?? null,
          yieldQuantity: 1,
          yieldUnit: prep.yieldUnit,
          category: prep.category,
          ingredients: {
            create: {
              ingredientId,
              quantityRequired: input.variantOutputQuantity,
              unit: unit as Unit,
            },
          },
        },
      });
    });

    revalidateVariantPaths();
    return { success: true, variantId: input.id };
  }

  const posAgg = await db.product.aggregate({
    where: { businessId, posCode: { not: null } },
    _max: { posCode: true },
  });
  const suggestedPos =
    input.posCode ?? (posAgg._max.posCode != null ? posAgg._max.posCode + 1 : 1);

  const created = await db.product.create({
    data: {
      businessId,
      name: productName,
      category: prep.category,
      yieldQuantity: 1,
      yieldUnit: prep.yieldUnit,
      salePrice: input.salePrice,
      posCode: suggestedPos,
      barcode: generateProductBarcode(productName),
      productType: ProductType.PREPARED,
      requiresKitchen: true,
      parentPrepId: prepId,
      variantLabel: label,
      variantSortOrder: sortOrder,
      variantOutputQuantity: input.variantOutputQuantity,
      ingredients: {
        create: {
          ingredientId,
          quantityRequired: input.variantOutputQuantity,
          unit: unit as Unit,
        },
      },
    },
    select: { id: true },
  });

  revalidateVariantPaths();
  return { success: true, variantId: created.id };
}

export async function deletePrepSellVariant(
  variantId: string
): Promise<{ success?: boolean; error?: string }> {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const variant = await db.product.findFirst({
    where: { id: variantId, businessId, parentPrepId: { not: null } },
    select: { id: true, name: true },
  });
  if (!variant) return { error: "Variant not found" };

  const orderLines = await db.orderLineItem.count({ where: { productId: variantId } });
  if (orderLines > 0) {
    return { error: `Cannot delete "${variant.name}" — it has order history` };
  }

  await db.product.delete({ where: { id: variantId } });
  revalidateVariantPaths();
  return { success: true };
}

export async function applyPrepVariantTemplateSet(
  prepId: string
): Promise<{ success?: boolean; error?: string; created?: number; skipped?: number }> {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const existing = await db.product.findMany({
    where: { businessId, parentPrepId: prepId },
    select: { variantLabel: true },
  });
  const usedLabels = new Set(
    existing.map((v) => v.variantLabel?.toLowerCase()).filter(Boolean)
  );

  let created = 0;
  let skipped = 0;

  for (const template of PREP_VARIANT_TEMPLATE_SET) {
    if (usedLabels.has(template.label.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const result = await savePrepSellVariant(prepId, {
      variantLabel: template.label,
      variantOutputQuantity: template.outputQuantity,
      salePrice: 0,
      posCode: null,
      variantSortOrder: template.sortOrder,
    });
    if (result.error) return { error: result.error };
    created += 1;
  }

  revalidateVariantPaths();
  return { success: true, created, skipped };
}
