import { Unit } from "@prisma/client";

type UnitFamily = "mass" | "volume" | "count";

const UNIT_FAMILY: Record<Unit, UnitFamily> = {
  g: "mass",
  kg: "mass",
  oz: "mass",
  lb: "mass",
  ml: "volume",
  L: "volume",
  pcs: "count",
};

/** Convert quantity between compatible units; returns null when conversion is unsupported. */
export function convertUnits(quantity: number, from: Unit, to: Unit): number | null {
  if (from === to) return quantity;

  const fromFamily = UNIT_FAMILY[from];
  const toFamily = UNIT_FAMILY[to];
  if (fromFamily !== toFamily || fromFamily === "count") return null;

  if (fromFamily === "mass") {
    const toGrams: Record<Unit, number | null> = {
      g: 1,
      kg: 1000,
      oz: 28.3495,
      lb: 453.592,
      ml: null,
      L: null,
      pcs: null,
    };
    const fromFactor = toGrams[from];
    const toFactor = toGrams[to];
    if (fromFactor == null || toFactor == null) return null;
    return (quantity * fromFactor) / toFactor;
  }

  const toMl: Record<Unit, number | null> = {
    ml: 1,
    L: 1000,
    g: null,
    kg: null,
    oz: null,
    lb: null,
    pcs: null,
  };
  const fromFactor = toMl[from];
  const toFactor = toMl[to];
  if (fromFactor == null || toFactor == null) return null;
  return (quantity * fromFactor) / toFactor;
}

export function unitsAreCompatible(a: Unit, b: Unit): boolean {
  return a === b || convertUnits(1, a, b) != null;
}

export function sumQuantityInUnit(
  items: { quantity: number | { toString(): string }; unit: Unit; isActive: boolean }[],
  targetUnit: Unit
): number {
  return items
    .filter((item) => item.isActive)
    .reduce((sum, item) => {
      const qty = typeof item.quantity === "number" ? item.quantity : Number(item.quantity);
      const converted = convertUnits(qty, item.unit, targetUnit);
      return sum + (converted ?? 0);
    }, 0);
}
