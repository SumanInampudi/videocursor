import { Prisma } from "@prisma/client";

function toNumber(value: number | Prisma.Decimal | string | null | undefined): number {
  if (value == null) return NaN;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  return Number(value);
}

/** Clamp wastage to 0–99% (100% would divide by zero on effective cost). */
export function normalizeWastagePercent(
  value: number | Prisma.Decimal | string | null | undefined
): number {
  const n = toNumber(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(99, Math.max(0, n));
}

/** Physical stock that counts toward recipes and order checks. */
export function usableQuantity(physicalQty: number, wastagePercent: number | null | undefined): number {
  const waste = normalizeWastagePercent(wastagePercent);
  return physicalQty * (1 - waste / 100);
}

/**
 * Cost per usable unit — inflates recipe/COGS for trim, spillage, etc.
 * Example: ₹100/kg with 10% waste → ₹111.11 per usable kg.
 */
export function effectiveCostPerUnit(
  costPerUnit: number,
  wastagePercent: number | null | undefined
): number {
  const waste = normalizeWastagePercent(wastagePercent);
  if (waste <= 0) return costPerUnit;
  return costPerUnit / (1 - waste / 100);
}
