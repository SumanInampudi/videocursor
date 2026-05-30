export const UNITS = ["g", "kg", "ml", "L", "pcs", "oz", "lb"] as const;

export type Unit = (typeof UNITS)[number];

export function formatQuantity(quantity: number | string, unit: string): string {
  const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(2);
  return `${formatted} ${unit}`;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}
