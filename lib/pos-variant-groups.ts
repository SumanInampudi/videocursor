/** POS menu grouping for prep batch sell variants. */

export type PosVariantProduct = {
  id: string;
  name: string;
  category: string;
  salePrice: number | null;
  posCode?: number | null;
  imageUrl?: string | null;
  productType?: string;
  requiresKitchen?: boolean;
  parentPrepId?: string | null;
  variantLabel?: string | null;
  variantOutputQuantity?: number | null;
  variantSortOrder?: number;
  yieldUnit?: string;
};

export type PosVariantGroup = {
  prepId: string;
  name: string;
  category: string;
  imageUrl: string | null;
  yieldUnit: string;
  variants: PosVariantProduct[];
};

export function buildPosVariantGroups(
  products: PosVariantProduct[],
  options?: { pricedOnly?: boolean }
): { groups: PosVariantGroup[]; standalone: PosVariantProduct[] } {
  const pricedOnly = options?.pricedOnly !== false;
  const pool = pricedOnly ? products.filter((p) => p.salePrice != null) : products;
  const variantChildren = pool.filter((p) => p.parentPrepId);
  const standalone = pool.filter((p) => !p.parentPrepId);

  const byPrep = new Map<string, PosVariantProduct[]>();
  for (const child of variantChildren) {
    const prepId = child.parentPrepId!;
    const list = byPrep.get(prepId) ?? [];
    list.push(child);
    byPrep.set(prepId, list);
  }

  const prepMeta = new Map<string, { name: string; category: string; yieldUnit: string }>();
  for (const child of variantChildren) {
    if (!prepMeta.has(child.parentPrepId!)) {
      const baseName = child.name.includes(" — ")
        ? child.name.split(" — ")[0].trim()
        : child.name;
      prepMeta.set(child.parentPrepId!, {
        name: baseName,
        category: child.category,
        yieldUnit: child.yieldUnit ?? "KG",
      });
    }
  }

  const groups: PosVariantGroup[] = [];
  for (const [prepId, variants] of byPrep) {
    const meta = prepMeta.get(prepId)!;
    variants.sort((a, b) => {
      const ao = a.variantSortOrder ?? 0;
      const bo = b.variantSortOrder ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.variantLabel ?? a.name).localeCompare(b.variantLabel ?? b.name);
    });
    const imageUrl = variants.find((v) => v.imageUrl)?.imageUrl ?? null;
    groups.push({
      prepId,
      name: meta.name,
      category: meta.category,
      imageUrl,
      yieldUnit: meta.yieldUnit,
      variants,
    });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));
  return { groups, standalone };
}

/** Lowest price among variants for "from ₹X" display. */
export function variantGroupFromPrice(variants: PosVariantProduct[]): number | null {
  const prices = variants
    .map((v) => v.salePrice)
    .filter((p): p is number => p != null && p >= 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}
