import { describe, expect, it } from "vitest";
import { planPrepBatchProduction, scalePrepBatchMultiplier } from "@/lib/prep-batch";

describe("prep batch planning", () => {
  const prep = {
    id: "p1",
    name: "Garam Masala",
    yieldQuantity: 500,
    prepOutputInventoryItemId: "out1",
    prepOutputInventoryItem: {
      id: "out1",
      quantity: 0,
      unit: "GM" as const,
      costPerUnit: 0,
    },
    ingredients: [
      {
        quantityRequired: 200,
        unit: "GM" as const,
        ingredient: {
          name: "Coriander",
          wastagePercent: 0,
          inventoryItems: [
            {
              id: "inv1",
              quantity: 1000,
              unit: "GM" as const,
              costPerUnit: 0.1,
              isActive: true,
              costLayers: [
                {
                  id: "layer1",
                  quantityRemaining: 1000,
                  costPerUnit: 0.1,
                  unit: "GM" as const,
                },
              ],
            },
          ],
        },
      },
    ],
  };

  it("scales multiplier from output qty vs recipe yield", () => {
    expect(scalePrepBatchMultiplier({ yieldQuantity: 500 }, 250)).toEqual({
      ok: true,
      multiplier: 0.5,
    });
  });

  it("plans input consumption for a batch", () => {
    const plan = planPrepBatchProduction(prep, 500);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.totalInputCost).toBeGreaterThan(0);
      expect(plan.costPerUnit).toBeGreaterThan(0);
      expect(plan.consumptions[0]?.quantityDeducted).toBe(200);
    }
  });
});
