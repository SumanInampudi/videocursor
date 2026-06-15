export type PosStockStatus = "ok" | "low" | "out" | "unavailable";

export type PosProductAvailability = {
  maxServings: number;
  status: PosStockStatus;
  label: string | null;
};

const LOW_STOCK_THRESHOLD = 3;

export function posAvailabilityFromMaxYield(
  maxYield: number,
  canMake: boolean
): PosProductAvailability {
  if (!canMake || maxYield <= 0) {
    return { maxServings: 0, status: "out", label: "Out of stock" };
  }
  if (maxYield <= LOW_STOCK_THRESHOLD) {
    return {
      maxServings: maxYield,
      status: "low",
      label: maxYield === 1 ? "1 left" : `${maxYield} left`,
    };
  }
  return { maxServings: maxYield, status: "ok", label: null };
}

export function cartExceedsAvailability(
  cartQty: number,
  maxServings: number,
  adding = 1
): boolean {
  if (maxServings <= 0) return true;
  return cartQty + adding > maxServings;
}
