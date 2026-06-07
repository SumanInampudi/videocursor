import { describe, expect, it } from "vitest";
import {
  getInventoryStockStatus,
  isInventoryItemLowStock,
} from "@/lib/inventory-stock";

describe("inventory stock status", () => {
  it("marks depleted active stock as out", () => {
    expect(
      getInventoryStockStatus({
        quantity: 0,
        reorderLevel: 5,
        unit: "kg",
        isActive: true,
      }).kind
    ).toBe("out");
  });

  it("uses wastage for low stock check", () => {
    expect(
      isInventoryItemLowStock({
        quantity: 10,
        reorderLevel: 9,
        unit: "kg",
        isActive: true,
        ingredient: { wastagePercent: 20 },
      })
    ).toBe(true);
  });

  it("ignores inactive items for low stock filter", () => {
    expect(
      isInventoryItemLowStock({
        quantity: 0,
        reorderLevel: 5,
        unit: "kg",
        isActive: false,
      })
    ).toBe(false);
  });
});
