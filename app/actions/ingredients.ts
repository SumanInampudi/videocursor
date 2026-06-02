"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { generateIngredientBarcode } from "@/lib/barcode";
import {
  STARTER_INGREDIENTS,
  ingredientSkuPrefix,
  normalizeIngredientName,
} from "@/lib/ingredients";
import { smartMatches } from "@/lib/smart-search";
import { ingredientSchema } from "@/lib/validations";
import { Unit } from "@prisma/client";

type IngredientResult = {
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

async function createIngredientFromName(name: string, category = "General", defaultUnit: Unit = Unit.g) {
  const normalizedName = normalizeIngredientName(name);
  if (!normalizedName) return { skipped: name };

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const existing = await db.ingredient.findFirst({
    where: { businessId, normalizedName },
  });
  if (existing) return { duplicate: existing };

  const ingredient = await db.ingredient.create({
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

  return { ingredient };
}

export async function getIngredients(filters?: { search?: string; category?: string }) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const ingredients = await db.ingredient.findMany({
    where: { businessId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { inventoryItems: true },
  });

  let filtered = ingredients;

  if (filters?.search) {
    const search = filters.search;
    filtered = filtered.filter(
      (ingredient) =>
        smartMatches(
          [
            ingredient.name,
            ingredient.sku,
            ingredient.barcode,
            ingredient.category,
            ingredient.aliases,
            ingredient.defaultUnit,
          ],
          search
        )
    );
  }

  if (filters?.category) {
    filtered = filtered.filter((ingredient) => ingredient.category === filters.category);
  }

  return serializeForClient(filtered);
}

export async function getIngredientCategories() {
  const ingredients = await db.ingredient.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return ingredients.map((ingredient) => ingredient.category);
}

export async function createIngredient(formData: FormData): Promise<IngredientResult> {
  const raw = Object.fromEntries(formData.entries());
  const isActiveRaw = raw.isActive;
  const parsed = ingredientSchema.safeParse({
    ...raw,
    sku: raw.sku || undefined,
    isActive:
      isActiveRaw == null ? true : isActiveRaw === "on" || isActiveRaw === "true",
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
    return { error: { name: ["Ingredient already exists"] } };
  }

  const sku = data.sku?.trim() || (await nextIngredientSku(data.name, businessId));

  try {
    const ingredient = await db.ingredient.create({
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

    revalidatePath("/ingredients");
    revalidatePath("/recipes");
    return { success: true, ingredient: serializeForClient(ingredient) };
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }
}

export async function createQuickIngredient(name: string): Promise<IngredientResult> {
  const result = await createIngredientFromName(name);

  if (result.duplicate) {
    return {
      error: { name: ["Ingredient already exists"] },
      ingredient: serializeForClient(result.duplicate),
    };
  }

  if (!result.ingredient) {
    return { error: { name: ["Ingredient name is required"] } };
  }

  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  return { success: true, ingredient: serializeForClient(result.ingredient) };
}

export async function updateIngredient(id: string, formData: FormData): Promise<IngredientResult> {
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
    return { error: { name: ["Ingredient already exists"] } };
  }

  try {
    const ingredient = await db.ingredient.update({
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
    revalidatePath("/inventory");
    revalidatePath("/recipes");
    revalidatePath("/yield");
    return { success: true, ingredient: serializeForClient(ingredient) };
  } catch {
    return { error: { sku: ["SKU already exists"] } };
  }
}

export async function bulkCreateIngredients(formData: FormData): Promise<IngredientResult> {
  const text = String(formData.get("items") || "");
  const category = String(formData.get("category") || "General").trim() || "General";
  const defaultUnit = String(formData.get("defaultUnit") || "g") as Unit;
  const names = parseBulkText(text);

  if (names.length === 0) {
    return { error: { items: ["Add at least one ingredient name"] } };
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

    const result = await createIngredientFromName(name, category, defaultUnit);
    if (result.ingredient) created += 1;
    if (result.duplicate || result.skipped) skipped.push(name);
  }

  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  return { success: true, created, skipped };
}

/** Resolve an ingredient from a scanned barcode (prefix 3). */
export async function getInventoryItemForIngredientBarcode(barcode: string) {
  const ingredient = await getIngredientByBarcode(barcode);
  if (!ingredient) return null;

  return db.inventoryItem.findFirst({
    where: { ingredientId: ingredient.id },
    select: { id: true, name: true, sku: true, supplier: true },
  });
}

export async function getIngredientByBarcode(barcode: string) {
  const normalized = barcode.replace(/\D/g, "");
  if (normalized.length < 8) return null;

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  return db.ingredient.findFirst({
    where: {
      businessId,
      OR: [{ barcode: normalized }, { barcode: normalized.slice(0, 13) }],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      category: true,
      defaultUnit: true,
      isActive: true,
    },
  });
}

export async function createInventoryFromIngredient(ingredientId: string) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const ingredient = await db.ingredient.findFirst({
    where: { id: ingredientId, businessId },
  });
  if (!ingredient) {
    return { error: "Ingredient not found" };
  }

  const existing = await db.inventoryItem.findFirst({
    where: { businessId, ingredientId },
    select: { id: true },
  });
  if (existing) {
    return { error: "Stock item already linked", itemId: existing.id };
  }

  const item = await db.inventoryItem.create({
    data: {
      businessId,
      ingredientId,
      name: ingredient.name,
      sku: `${ingredient.sku}-STK`,
      category: ingredient.category,
      quantity: 0,
      unit: ingredient.defaultUnit,
      reorderLevel: 0,
      costPerUnit: 0,
      isActive: true,
    },
  });

  revalidatePath("/ingredients");
  revalidatePath("/inventory");
  return { success: true, itemId: item.id };
}

export async function seedStarterIngredients(): Promise<IngredientResult> {
  let created = 0;
  const skipped: string[] = [];

  for (const item of STARTER_INGREDIENTS) {
    const result = await createIngredientFromName(item.name, item.category, item.defaultUnit);
    if (result.ingredient) created += 1;
    if (result.duplicate) skipped.push(item.name);
  }

  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  return { success: true, created, skipped };
}
