"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sortPosCategories } from "@/lib/pos-categories";
import { serializeForClient } from "@/lib/serialize";

const POS_CATEGORY_ORDER_KEY = "pos_category_order";

const POS_PATHS = ["/orders/pos", "/orders/pos/settings"];

function revalidatePos() {
  for (const p of POS_PATHS) revalidatePath(p);
}

async function readCategoryOrder(): Promise<string[] | null> {
  const row = await db.appSetting.findUnique({ where: { key: POS_CATEGORY_ORDER_KEY } });
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
  const saved = await readCategoryOrder();
  return sortPosCategories(allCategories, saved);
}

export async function getPosCategorySettings() {
  const recipes = await db.recipe.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const allCategories = recipes.map((r) => r.category);
  const savedOrder = await readCategoryOrder();
  const ordered = sortPosCategories(allCategories, savedOrder);

  return serializeForClient({
    allCategories,
    ordered,
    savedOrder: savedOrder ?? [],
  });
}

export async function savePosCategoryOrder(categories: string[]) {
  const unique = [...new Set(categories.map((c) => c.trim()).filter(Boolean))];
  await db.appSetting.upsert({
    where: { key: POS_CATEGORY_ORDER_KEY },
    create: { key: POS_CATEGORY_ORDER_KEY, value: JSON.stringify(unique) },
    update: { value: JSON.stringify(unique) },
  });
  revalidatePos();
  return { success: true };
}
