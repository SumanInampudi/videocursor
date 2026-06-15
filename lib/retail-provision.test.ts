import { describe, expect, it } from "vitest";
import { receiveNewItemSchema } from "@/lib/validations";

describe("receiveNewItemSchema", () => {
  it("requires sale price when adding to menu", () => {
    const result = receiveNewItemSchema.safeParse({
      name: "Coke",
      category: "Retail",
      unit: "Pcs",
      quantity: 24,
      unitCost: 25,
      salePrice: null,
      quantityPerSale: 1,
      addToMenu: true,
    });
    expect(result.success).toBe(false);
  });

  it("allows stock-only without menu", () => {
    const result = receiveNewItemSchema.safeParse({
      name: "Coke",
      category: "Retail",
      unit: "Pcs",
      quantity: 24,
      unitCost: 25,
      salePrice: null,
      quantityPerSale: 1,
      addToMenu: false,
    });
    expect(result.success).toBe(true);
  });
});
