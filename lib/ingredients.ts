export function normalizeIngredientName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ingredientSkuPrefix(name: string) {
  const words = normalizeIngredientName(name).split(" ").filter(Boolean);
  const base =
    words.length === 1
      ? words[0].slice(0, 4)
      : words.map((word) => word[0]).join("").slice(0, 4);

  return `ING-${(base || "ITEM").toUpperCase().padEnd(3, "X")}`;
}
