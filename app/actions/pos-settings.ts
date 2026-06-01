"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { sortPosCategories } from "@/lib/pos-categories";
import { serializeForClient } from "@/lib/serialize";

const POS_CATEGORY_ORDER_KEY = "pos_category_order";

const POS_PATHS = ["/orders/pos", "/orders/pos/settings"];

function revalidatePos() {
  for (const p of POS_PATHS) revalidatePath(p);
}

async function readCategoryOrder(businessId: string): Promise<string[] | null> {
  const row = await db.appSetting.findUnique({
    where: { businessId_key: { businessId, key: POS_CATEGORY_ORDER_KEY } },
  });
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

export async function getOrderedPosCategories(allCategories: string[]) {
  const { businessId } = await requireBusinessContext();
  const saved = await readCategoryOrder(businessId);
  return sortPosCategories(allCategories, saved);
}

export async function getPosCategorySettings() {
  const { businessId } = await requireBusinessContext();
  const recipes = await db.recipe.findMany({
    where: { businessId },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const allCategories = recipes.map((r) => r.category);
  const savedOrder = await readCategoryOrder(businessId);
  const ordered = sortPosCategories(allCategories, savedOrder);

  return serializeForClient({
    allCategories,
    ordered,
    savedOrder: savedOrder ?? [],
  });
}

export async function savePosCategoryOrder(categories: string[]) {
  const { businessId } = await requireBusinessContext();
  const unique = [...new Set(categories.map((c) => c.trim()).filter(Boolean))];
  await db.appSetting.upsert({
    where: { businessId_key: { businessId, key: POS_CATEGORY_ORDER_KEY } },
    create: {
      businessId,
      key: POS_CATEGORY_ORDER_KEY,
      value: JSON.stringify(unique),
    },
    update: { value: JSON.stringify(unique) },
  });
  revalidatePos();
  return { success: true };
}
