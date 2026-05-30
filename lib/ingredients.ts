import { Unit } from "@prisma/client";

export const STARTER_INGREDIENTS: { name: string; category: string; defaultUnit: Unit }[] = [
  { name: "Chicken Bone-In", category: "Meat", defaultUnit: Unit.g },
  { name: "Chicken Boneless", category: "Meat", defaultUnit: Unit.g },
  { name: "Mutton Bone-In", category: "Meat", defaultUnit: Unit.g },
  { name: "Mutton Boneless", category: "Meat", defaultUnit: Unit.g },
  { name: "Oil", category: "Oils", defaultUnit: Unit.ml },
  { name: "Basmati Rice", category: "Rice & Grains", defaultUnit: Unit.g },
  { name: "Garam Masala", category: "Spices", defaultUnit: Unit.g },
  { name: "Cloves (Lavagaalu)", category: "Spices", defaultUnit: Unit.g },
  { name: "Cinamon Sticks (Dasam Chekka)", category: "Spices", defaultUnit: Unit.g },
  { name: "Yalakulu", category: "Spices", defaultUnit: Unit.g },
  { name: "Jajipuvvu", category: "Spices", defaultUnit: Unit.g },
  { name: "Japatri", category: "Spices", defaultUnit: Unit.g },
  { name: "Salt", category: "Spices", defaultUnit: Unit.g },
  { name: "Pasupu", category: "Spices", defaultUnit: Unit.g },
  { name: "Karam", category: "Spices", defaultUnit: Unit.g },
  { name: "Red-Chilli", category: "Produce", defaultUnit: Unit.g },
  { name: "Green-Chilli", category: "Produce", defaultUnit: Unit.g },
  { name: "Curd", category: "Dairy", defaultUnit: Unit.g },
];

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
