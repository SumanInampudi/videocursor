/** Canonical units — only these may be stored or selected in the app. */
export const UNITS = ["KG", "GM", "LT", "ML", "Pcs"] as const;

export type AppUnit = (typeof UNITS)[number];

export const DEFAULT_UNIT: AppUnit = "GM";

const UNIT_ALIASES: Record<string, AppUnit> = {
  kg: "KG",
  KG: "KG",
  g: "GM",
  gm: "GM",
  GM: "GM",
  gram: "GM",
  grams: "GM",
  l: "LT",
  lt: "LT",
  L: "LT",
  LT: "LT",
  liter: "LT",
  litre: "LT",
  ml: "ML",
  ML: "ML",
  pcs: "Pcs",
  Pcs: "Pcs",
  pc: "Pcs",
  piece: "Pcs",
  pieces: "Pcs",
  // Legacy values removed from the app
  oz: "GM",
  lb: "KG",
};

/** Map free text / legacy DB values to a canonical unit; null when unrecognized. */
export function coerceUnit(value: string | null | undefined): AppUnit | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = UNITS.find((u) => u === trimmed);
  if (direct) return direct;
  const alias = UNIT_ALIASES[trimmed] ?? UNIT_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}

/** Like coerceUnit but falls back to DEFAULT_UNIT. */
export function normalizeUnit(value: string | null | undefined): AppUnit {
  return coerceUnit(value) ?? DEFAULT_UNIT;
}

export function isAppUnit(value: string): value is AppUnit {
  return (UNITS as readonly string[]).includes(value);
}

export function formatQuantity(quantity: number | string, unit: string): string {
  const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(2);
  return `${formatted} ${unit}`;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
}
