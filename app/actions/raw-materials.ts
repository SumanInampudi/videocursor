"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { generateIngredientBarcode } from "@/lib/barcode";
import { ingredientSkuPrefix, normalizeIngredientName } from "@/lib/ingredients";
import { smartMatches } from "@/lib/smart-search";
import { ingredientSchema } from "@/lib/validations";
import { Prisma, Unit } from "@prisma/client";

type RawMaterialResult = {
  error?: Record<string, string[]>;
  success?: boolean;
  ingredient?: {
    id: string;
    name: string;
    sku: string;
    category: string;
    defaultUnit: Unit;
    isActive: boolean;
  };
  created?: number;
  skipped?: string[];
};

function parseBulkText(text: string) {
  return text
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function nextIngredientSku(name: string, businessId: string) {
  const prefix = ingredientSkuPrefix(name);
  const existing = await db.ingredient.findMany({
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

async function ensureZeroStockForRawMaterial(
  tx: Prisma.TransactionClient,
  businessId: string,
  rawMaterial: { id: string; name: string; sku: string; category: string; defaultUnit: Unit }
) {
  const existing = await tx.inventoryItem.findFirst({
    where: { businessId, ingredientId: rawMaterial.id },
    select: { id: true },
  });
  if (existing) return;

  await tx.inventoryItem.create({
    data: {
      businessId,
      ingredientId: rawMaterial.id,
      name: rawMaterial.name,
      sku: `${rawMaterial.sku}-STK`,
      category: rawMaterial.category,
      quantity: 0,
      unit: rawMaterial.defaultUnit,
      reorderLevel: 0,
      costPerUnit: 0,
      isActive: true,
    },
  });
}

async function createRawMaterialFromName(name: string, category = "General", defaultUnit: Unit = Unit.g) {
  const normalizedName = normalizeIngredientName(name);
  if (!normalizedName) return { skipped: name };

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const existing = await db.ingredient.findFirst({
    where: { businessId, normalizedName },
  });
  if (existing) return { duplicate: existing };

  const rawMaterial = await db.$transaction(async (tx) => {
    const created = await tx.ingredient.create({
      data: {
        businessId,
        name: name.trim(),
        normalizedName,
        sku: await nextIngredientSku(name, businessId),
        barcode: generateIngredientBarcode(name),
        category,
        defaultUnit,
        isActive: true,
      },
    });
    await ensureZeroStockForRawMaterial(tx, businessId, created);
    return created;
  });

  return { ingredient: rawMaterial };
}

export async function getRawMaterials(filters?: { search?: string; category?: string }) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const rawMaterials = await db.ingredient.findMany({
    where: { businessId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { inventoryItems: true },
  });

  let filtered = rawMaterials;

  if (filters?.search) {
    const search = filters.search;
    filtered = filtered.filter((rawMaterial) =>
      smartMatches(
        [
          rawMaterial.name,
          rawMaterial.sku,
          rawMaterial.category,
          rawMaterial.aliases,
          rawMaterial.defaultUnit,
        ],
        search
      )
    );
  }

  if (filters?.category) {
    filtered = filtered.filter((rawMaterial) => rawMaterial.category === filters.category);
  }

  return serializeForClient(filtered);
}

export async function getRawMaterialCategories() {
  const rawMaterials = await db.ingredient.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rawMaterials.map((rawMaterial) => rawMaterial.category);
}

export async function createRawMaterial(formData: FormData): Promise<RawMaterialResult> {
  const raw = Object.fromEntries(formData.entries());
  const isActiveRaw = raw.isActive;
  const parsed = ingredientSchema.safeParse({
    ...raw,
    sku: raw.sku || undefined,
    isActive: isActiveRaw == null ? true : isActiveRaw === "on" || isActiveRaw === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const normalizedName = normalizeIngredientName(data.name);

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const duplicate = await db.ingredient.findFirst({
    where: { businessId, normalizedName },
  });
  if (duplicate) {
    return { error: { name: ["Raw material already exists"] } };
  }

  const sku = data.sku?.trim() || (await nextIngredientSku(data.name, businessId));

  try {
    const rawMaterial = await db.$transaction(async (tx) => {
      const created = await tx.ingredient.create({
        data: {
          businessId,
          name: data.name,
          normalizedName,
          sku,
          barcode: generateIngredientBarcode(data.name),
          category: data.category,
          defaultUnit: data.defaultUnit as Unit,
          aliases: data.aliases || null,
          notes: data.notes || null,
          wastagePercent: data.wastagePercent,
          isActive: data.isActive,
        },
      });
      await ensureZeroStockForRawMaterial(tx, businessId, created);
      return created;
    });

    revalidatePath("/ingredients");
    revalidatePath("/raw-materials");
    revalidatePath("/inventory");
    revalidatePath("/products");
    return { success: true, ingredient: serializeForClient(rawMaterial) };
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }
}

export async function createQuickRawMaterial(name: string): Promise<RawMaterialResult> {
  const result = await createRawMaterialFromName(name);

  if (result.duplicate) {
    return {
      error: { name: ["Raw material already exists"] },
      ingredient: serializeForClient(result.duplicate),
    };
  }

  if (!result.ingredient) {
    return { error: { name: ["Raw material name is required"] } };
  }

  revalidatePath("/ingredients");
  revalidatePath("/raw-materials");
  revalidatePath("/products");
  return { success: true, ingredient: serializeForClient(result.ingredient) };
}

export async function updateRawMaterial(id: string, formData: FormData): Promise<RawMaterialResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ingredientSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const normalizedName = normalizeIngredientName(data.name);

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const duplicateName = await db.ingredient.findFirst({
    where: {
      businessId,
      normalizedName,
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicateName) {
    return { error: { name: ["Raw material already exists"] } };
  }

  try {
    const rawMaterial = await db.ingredient.update({
      where: { id },
      data: {
        name: data.name,
        normalizedName,
        sku: data.sku?.trim() || (await nextIngredientSku(data.name, businessId)),
        category: data.category,
        defaultUnit: data.defaultUnit as Unit,
        aliases: data.aliases || null,
        notes: data.notes || null,
        wastagePercent: data.wastagePercent,
        isActive: data.isActive,
      },
    });

    revalidatePath("/ingredients");
    revalidatePath("/raw-materials");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/yield");
    return { success: true, ingredient: serializeForClient(rawMaterial) };
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }
}

export async function bulkCreateRawMaterials(formData: FormData): Promise<RawMaterialResult> {
  const text = String(formData.get("items") || "");
  const category = String(formData.get("category") || "General").trim() || "General";
  const defaultUnit = String(formData.get("defaultUnit") || "g") as Unit;
  const names = parseBulkText(text);

  if (names.length === 0) {
    return { error: { items: ["Add at least one raw material name"] } };
  }

  let created = 0;
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const normalized = normalizeIngredientName(name);
    if (seen.has(normalized)) {
      skipped.push(name);
      continue;
    }
    seen.add(normalized);

    const result = await createRawMaterialFromName(name, category, defaultUnit);
    if (result.ingredient) created += 1;
    if (result.duplicate || result.skipped) skipped.push(name);
  }

  revalidatePath("/ingredients");
  revalidatePath("/raw-materials");
  revalidatePath("/products");
  return { success: true, created, skipped };
}

export async function createStockFromRawMaterial(rawMaterialId: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const rawMaterial = await db.ingredient.findFirst({
    where: { id: rawMaterialId, businessId },
  });
  if (!rawMaterial) {
    return { error: "Raw material not found" };
  }

  const existing = await db.inventoryItem.findFirst({
    where: { businessId, ingredientId: rawMaterialId },
    select: { id: true },
  });
  if (existing) {
    return { error: "Stock item already linked", itemId: existing.id };
  }

  const item = await db.inventoryItem.create({
    data: {
      businessId,
      ingredientId: rawMaterialId,
      name: rawMaterial.name,
      sku: `${rawMaterial.sku}-STK`,
      category: rawMaterial.category,
      quantity: 0,
      unit: rawMaterial.defaultUnit,
      reorderLevel: 0,
      costPerUnit: 0,
      isActive: true,
    },
  });

  revalidatePath("/ingredients");
  revalidatePath("/raw-materials");
  revalidatePath("/inventory");
  return { success: true, itemId: item.id };
}

export async function listRawMaterials(filters?: { search?: string; category?: string }) {
  return getRawMaterials(filters);
}

export async function listRawMaterialCategories() {
  return getRawMaterialCategories();
}

export async function createRawMaterialAction(formData: FormData) {
  return createRawMaterial(formData);
}

export async function createQuickRawMaterialAction(name: string) {
  return createQuickRawMaterial(name);
}

export async function updateRawMaterialAction(id: string, formData: FormData) {
  return updateRawMaterial(id, formData);
}

export async function bulkCreateRawMaterialsAction(formData: FormData) {
  return bulkCreateRawMaterials(formData);
}

export async function createStockFromRawMaterialAction(rawMaterialId: string) {
  return createStockFromRawMaterial(rawMaterialId);
}
