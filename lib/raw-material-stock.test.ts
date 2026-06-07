import { describe, expect, it } from "vitest";
import {
  getRawMaterialStockStatus,
  isRawMaterialLowStock,
} from "@/lib/raw-material-stock";

describe("raw material stock status", () => {
  it("marks no inventory as no_stock", () => {
    expect(getRawMaterialStockStatus(0, []).kind).toBe("no_stock");
  });

  it("marks depleted stock as out", () => {
    expect(
      getRawMaterialStockStatus(0, [
        { quantity: 0, reorderLevel: 5, unit: "KG", isActive: true },
      ]).kind
    ).toBe("out");
  });

  it("marks below reorder as low", () => {
    expect(
      getRawMaterialStockStatus(0, [
        { quantity: 2, reorderLevel: 5, unit: "KG", isActive: true },
      ]).kind
    ).toBe("low");
  });

  it("excludes items without stock lines from low stock filter", () => {
    expect(isRawMaterialLowStock(0, [])).toBe(false);
  });
});
