import "server-only";

import { db } from "@/lib/db";
import { normalizeUnit } from "@/lib/units";
import type { Unit } from "@prisma/client";

type BomLine = { ingredientId: string; unit: string };

/** Force each BOM line unit to the raw material's defaultUnit (set once at catalog creation). */
export async function resolveBomUnitsFromCatalog(
  businessId: string,
  lines: BomLine[]
): Promise<{ ingredientId: string; unit: Unit }[] | { error: string }> {
  if (lines.length === 0) return [];

  const ids = [...new Set(lines.map((l) => l.ingredientId))];
  const ingredients = await db.ingredient.findMany({
    where: { businessId, id: { in: ids } },
    select: { id: true, defaultUnit: true, name: true },
  });
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  const resolved: { ingredientId: string; unit: Unit }[] = [];
  for (const line of lines) {
    const ing = byId.get(line.ingredientId);
    if (!ing) {
      return { error: `Raw material not found for recipe line` };
    }
    resolved.push({ ingredientId: line.ingredientId, unit: ing.defaultUnit });
  }
  return resolved;
}

/** Inventory stock unit follows linked raw material when present. */
export async function resolveInventoryUnit(
  businessId: string,
  ingredientId: string | null | undefined,
  submittedUnit: string
): Promise<Unit> {
  if (ingredientId) {
    const ing = await db.ingredient.findFirst({
      where: { id: ingredientId, businessId },
      select: { defaultUnit: true },
    });
    if (ing) return ing.defaultUnit;
  }
  return normalizeUnit(submittedUnit) as Unit;
}
