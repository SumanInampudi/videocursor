import { describe, expect, it } from "vitest";
import { ProductType } from "@prisma/client";
import { aggregateInventoryDemand, checkSharedInventoryStock } from "@/lib/inventory-demand";
import type { ProductForStockPlan } from "@/lib/product-fulfillment";

const paneerStock = {
  id: "paneer-inv",
  quantity: 1000,
  unit: "GM" as const,
  costPerUnit: 0.5,
  isActive: true,
  costLayers: [
    { id: "layer-p", quantityRemaining: 1000, costPerUnit: 0.5, unit: "GM" as const },
  ],
};

const retailPaneer: ProductForStockPlan = {
  id: "retail-paneer",
  name: "Paneer side",
  productType: ProductType.RETAIL,
  retailInventoryItem: paneerStock,
  retailQuantityPerSale: 200,
  ingredients: [],
};

const curry: ProductForStockPlan = {
  id: "curry",
  name: "Palak Paneer",
  productType: ProductType.PREPARED,
  ingredients: [
    {
      quantityRequired: 150,
      unit: "GM",
      ingredient: {
        name: "Paneer",
        wastagePercent: 0,
        inventoryItems: [paneerStock],
      },
    },
  ],
};

describe("shared inventory demand", () => {
  it("aggregates demand from retail and prepared lines on same SKU", () => {
    const demand = aggregateInventoryDemand([retailPaneer, curry], [
      { productId: "retail-paneer", quantity: 2 },
      { productId: "curry", quantity: 3 },
    ]);
    expect(demand.get("paneer-inv")).toBe(200 * 2 + 150 * 3);
  });

  it("fails when combined demand exceeds on hand", () => {
    const result = checkSharedInventoryStock(
      [retailPaneer, curry],
      [
        { productId: "retail-paneer", quantity: 4 },
        { productId: "curry", quantity: 4 },
      ],
      [{ id: "paneer-inv", name: "Paneer", quantity: 1000, unit: "GM" }]
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.includes("shared stock"))).toBe(true);
    }
  });
});
