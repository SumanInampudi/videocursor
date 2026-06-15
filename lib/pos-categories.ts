/** Merge saved POS category order with all categories from recipes. */
export function sortPosCategories(allCategories: string[], savedOrder: string[] | null): string[] {
  const unique = [...new Set(allCategories)];
  if (!savedOrder?.length) {
    return unique.sort((a, b) => a.localeCompare(b));
  }
  const ordered = savedOrder.filter((c) => unique.includes(c));
  const remaining = unique.filter((c) => !ordered.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...remaining];
}
