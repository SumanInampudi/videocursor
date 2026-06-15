/** Included sides / accompaniments (client + server safe). */

export type ProductInclusionRef = {
  includedProductId: string;
  includedProductName: string;
  quantityPerParent: number;
  imageUrl?: string | null;
};

export type PaidLineInput = { productId: string; quantity: number };

export type ExpandedLineInput = PaidLineInput & {
  productName?: string;
  isIncluded?: boolean;
};

export function formatIncludedProductName(name: string): string {
  return `${name} (included)`;
}

export function isIncludedLineName(name: string): boolean {
  return name.endsWith(" (included)");
}

/** Expand paid cart/order lines with configured free inclusions. */
export function expandPaidLinesWithInclusions(
  paidLines: PaidLineInput[],
  inclusionsByParent: Record<string, ProductInclusionRef[]>
): ExpandedLineInput[] {
  const includedAgg = new Map<
    string,
    { productId: string; productName: string; quantity: number }
  >();

  for (const line of paidLines) {
    const inclusions = inclusionsByParent[line.productId] ?? [];
    for (const inc of inclusions) {
      const qty = line.quantity * inc.quantityPerParent;
      if (qty <= 0) continue;
      const existing = includedAgg.get(inc.includedProductId);
      if (existing) {
        existing.quantity += qty;
      } else {
        includedAgg.set(inc.includedProductId, {
          productId: inc.includedProductId,
          productName: formatIncludedProductName(inc.includedProductName),
          quantity: qty,
        });
      }
    }
  }

  const expanded: ExpandedLineInput[] = paidLines.map((line) => ({
    ...line,
    isIncluded: false,
  }));

  for (const row of includedAgg.values()) {
    expanded.push({
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      isIncluded: true,
    });
  }

  return expanded;
}

export type DisplayCartLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
  isIncluded?: boolean;
};

/** POS cart display: paid lines + merged included companions. */
export function buildDisplayCartLines(
  paidCart: DisplayCartLine[],
  inclusionsByParent: Record<string, ProductInclusionRef[]>
): DisplayCartLine[] {
  const paid = paidCart.filter((line) => !line.isIncluded);
  const includedAgg = new Map<string, DisplayCartLine>();

  for (const line of paid) {
    for (const inc of inclusionsByParent[line.productId] ?? []) {
      const qty = line.quantity * inc.quantityPerParent;
      if (qty <= 0) continue;
      const existing = includedAgg.get(inc.includedProductId);
      if (existing) {
        existing.quantity += qty;
      } else {
        includedAgg.set(inc.includedProductId, {
          productId: inc.includedProductId,
          name: formatIncludedProductName(inc.includedProductName),
          quantity: qty,
          unitPrice: 0,
          imageUrl: inc.imageUrl ?? null,
          isIncluded: true,
        });
      }
    }
  }

  return [...paid, ...includedAgg.values()];
}

export function inclusionsMapFromPosProducts(
  products: {
    id: string;
    inclusions?: ProductInclusionRef[];
  }[]
): Record<string, ProductInclusionRef[]> {
  const map: Record<string, ProductInclusionRef[]> = {};
  for (const product of products) {
    if (product.inclusions?.length) {
      map[product.id] = product.inclusions;
    }
  }
  return map;
}
