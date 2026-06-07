import { Unit } from "@prisma/client";

type UnitFamily = "mass" | "volume" | "count";

const UNIT_FAMILY: Record<Unit, UnitFamily> = {
  GM: "mass",
  KG: "mass",
  ML: "volume",
  LT: "volume",
  Pcs: "count",
};

/** Convert quantity between compatible units; returns null when conversion is unsupported. */
export function convertUnits(quantity: number, from: Unit, to: Unit): number | null {
  if (from === to) return quantity;

  const fromFamily = UNIT_FAMILY[from];
  const toFamily = UNIT_FAMILY[to];
  if (fromFamily !== toFamily || fromFamily === "count") return null;

  if (fromFamily === "mass") {
    const toGrams: Record<Unit, number | null> = {
      GM: 1,
      KG: 1000,
      ML: null,
      LT: null,
      Pcs: null,
    };
    const fromFactor = toGrams[from];
    const toFactor = toGrams[to];
    if (fromFactor == null || toFactor == null) return null;
    return (quantity * fromFactor) / toFactor;
  }

  const toMl: Record<Unit, number | null> = {
    ML: 1,
    LT: 1000,
    GM: null,
    KG: null,
    Pcs: null,
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
