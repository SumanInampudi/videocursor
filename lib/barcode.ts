/** EAN-13 check digit for a 12-digit body (digits only). */
export function ean13CheckDigit(body12: string): string {
  const digits = body12.replace(/\D/g, "").padStart(12, "0").slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(digits[i]!, 10);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${digits}${check}`;
}

/** Internal EAN-13-style barcode. Prefix: 2 = product, 3 = ingredient. */
function generateInternalBarcode(prefix: "2" | "3", seed?: string): string {
  const timePart = Date.now().toString().slice(-8);
  const seedPart = seed
    ? Array.from(seed)
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        .toString()
        .slice(-4)
    : Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
  const body = `${prefix}${timePart}${seedPart}`.slice(0, 12).padEnd(12, "0");
  return ean13CheckDigit(body);
}

/** Product barcode (prefix 2). */
export function generateProductBarcode(seed?: string): string {
  return generateInternalBarcode("2", seed);
}

/** Ingredient barcode (prefix 3) — for scanner input in forms. */
export function generateIngredientBarcode(seed?: string): string {
  return generateInternalBarcode("3", seed);
}

export function barcodeEntityType(barcode: string): "ingredient" | "product" | "unknown" {
  const digit = barcode.replace(/\D/g, "")[0];
  if (digit === "3") return "ingredient";
  if (digit === "2") return "product";
  return "unknown";
}

export function formatBarcodeDisplay(barcode: string): string {
  const clean = barcode.replace(/\D/g, "");
  if (clean.length !== 13) return barcode;
  return `${clean.slice(0, 1)} ${clean.slice(1, 7)} ${clean.slice(7, 13)}`;
}
