import { describe, expect, it } from "vitest";
import { ProductType } from "@prisma/client";
import {
  counterLineProgressForRetail,
  filterKitchenLines,
  filterRetailLines,
  isCounterLine,
  isKitchenLine,
  kitchenLineProgressForKitchen,
  orderHasKitchenLines,
  orderHasRetailLines,
} from "@/lib/product-fulfillment";

const kitchenProduct = { productType: ProductType.PREPARED, requiresKitchen: true };
const retailProduct = { productType: ProductType.RETAIL, requiresKitchen: false };
const retailKitchenProduct = { productType: ProductType.RETAIL, requiresKitchen: true };

describe("product fulfillment line filters", () => {
  const lines = [
    { quantity: 2, kitchenDoneQty: 1, product: kitchenProduct },
    { quantity: 1, kitchenDoneQty: 0, product: retailProduct },
    { quantity: 3, kitchenDoneQty: 0, product: retailKitchenProduct },
  ];

  it("splits kitchen vs counter lines", () => {
    expect(filterKitchenLines(lines)).toHaveLength(2);
    expect(filterRetailLines(lines)).toHaveLength(1);
    expect(isKitchenLine(kitchenProduct)).toBe(true);
    expect(isKitchenLine(retailKitchenProduct)).toBe(true);
    expect(isCounterLine(retailProduct)).toBe(true);
    expect(orderHasKitchenLines(lines)).toBe(true);
    expect(orderHasRetailLines(lines)).toBe(true);
  });

  it("tracks progress per station", () => {
    expect(kitchenLineProgressForKitchen(lines)).toEqual({ done: 1, total: 5 });
    expect(counterLineProgressForRetail(lines)).toEqual({ done: 0, total: 1 });
  });
});
