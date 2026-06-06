import { describe, expect, it } from "vitest";
import { allocatePromotionToLines } from "@/lib/promotion-engine/allocate";
import { buildPromotionHints } from "@/lib/promotion-engine/hints";
import { applyManagerAdjustments } from "@/lib/promotion-engine/manager";
import { calculatePromotionAmount } from "@/lib/promotion-engine/calculate";
import { applyCodePromotion, applyPromotions, emptyPromotionResult } from "@/lib/promotion-engine/apply";
import { estimatePromotionImpact } from "@/lib/promotion-engine/impact";
import { lineMatchesTargets } from "@/lib/promotion-engine/targets";
import { isPromotionEligible } from "@/lib/promotion-engine/validate";

const basePromotion = {
  id: "disc-1",
  code: "SAVE10",
  name: "Save 10%",
  kind: "CHECK_PERCENT" as const,
  application: "CODE" as const,
  scope: "ORDER" as const,
  stackingPolicy: "EXCLUSIVE" as const,
  priority: 100,
  value: 10,
  minOrderAmount: null,
  maxDiscountAmount: null,
  isActive: true,
  validFrom: null,
  validTo: null,
  schedule: null,
  channels: [] as import("@prisma/client").OrderChannel[],
  targets: [],
  bogoConfig: null,
  comboConfig: null,
  tieredConfig: null,
  customerSegmentConfig: null,
  paymentMethods: [],
};

describe("calculatePromotionAmount", () => {
  it("calculates percent off subtotal", () => {
    expect(calculatePromotionAmount("CHECK_PERCENT", 10, 1000)).toBe(100);
  });

  it("caps fixed discount at subtotal", () => {
    expect(calculatePromotionAmount("CHECK_FIXED", 500, 300)).toBe(300);
  });

  it("respects max discount cap", () => {
    expect(calculatePromotionAmount("CHECK_PERCENT", 50, 1000, 200)).toBe(200);
  });
});

describe("isPromotionEligible", () => {
  it("rejects below minimum order", () => {
    expect(
      isPromotionEligible({ ...basePromotion, minOrderAmount: 500 }, 400, "DINE_IN")
    ).toBe(false);
  });

  it("rejects wrong channel", () => {
    expect(
      isPromotionEligible(
        { ...basePromotion, channels: ["ONLINE"] },
        1000,
        "DINE_IN"
      )
    ).toBe(false);
  });
});

describe("lineMatchesTargets", () => {
  it("matches category targets case-insensitively", () => {
    expect(
      lineMatchesTargets(
        {
          productId: "p1",
          productName: "Coke",
          category: "Beverages",
          quantity: 1,
          unitSalePrice: 50,
          revenue: 50,
        },
        [{ role: "APPLY_TO", targetType: "CATEGORY", productId: null, category: "beverages" }]
      )
    ).toBe(true);
  });
});

describe("allocatePromotionToLines", () => {
  it("spreads discount proportionally across lines", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 1,
        unitSalePrice: 600,
        revenue: 600,
      },
      {
        productId: "b",
        productName: "B",
        category: "Food",
        quantity: 1,
        unitSalePrice: 400,
        revenue: 400,
      },
    ];

    const result = allocatePromotionToLines(basePromotion, lines, 1000);
    expect(result?.discountTotal).toBe(100);
    expect(result?.nextLines[0]?.revenue).toBe(540);
    expect(result?.nextLines[1]?.revenue).toBe(360);
  });
});

describe("applyCodePromotion", () => {
  it("returns empty result shape when no promotion", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 1,
        unitSalePrice: 100,
        revenue: 100,
      },
    ];
    const empty = emptyPromotionResult(lines);
    expect(empty.discountTotal).toBe(0);
    expect(empty.appliedPromotions).toHaveLength(0);
  });

  it("applies valid code promotion", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 2,
        unitSalePrice: 500,
        revenue: 1000,
      },
    ];
    const result = applyCodePromotion(basePromotion, lines, 1000);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.discountTotal).toBe(100);
      expect(result.appliedPromotions).toHaveLength(1);
    }
  });
});

describe("BOGO promotions", () => {
  it("applies buy 1 get 1 free on matching products", () => {
    const lines = [
      {
        productId: "pizza",
        productName: "Pizza",
        category: "Food",
        quantity: 2,
        unitSalePrice: 300,
        revenue: 600,
      },
    ];
    const promotion = {
      ...basePromotion,
      kind: "BOGO" as const,
      value: 100,
      bogoConfig: {
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountPercent: 100,
        applyToCheapest: true,
      },
      targets: [{ role: "APPLY_TO" as const, targetType: "PRODUCT" as const, productId: "pizza", category: null }],
    };
    const result = allocatePromotionToLines(promotion, lines, 600);
    expect(result?.discountTotal).toBe(300);
    expect(result?.nextLines[0]?.revenue).toBe(300);
  });
});

describe("COMBO promotions", () => {
  it("applies bundle price when all members are in cart", () => {
    const lines = [
      {
        productId: "burger",
        productName: "Burger",
        category: "Food",
        quantity: 1,
        unitSalePrice: 150,
        revenue: 150,
      },
      {
        productId: "fries",
        productName: "Fries",
        category: "Food",
        quantity: 1,
        unitSalePrice: 80,
        revenue: 80,
      },
    ];
    const promotion = {
      ...basePromotion,
      kind: "COMBO_PRICE" as const,
      value: 199,
      comboConfig: { comboPrice: 199 },
      targets: [
        { role: "BUNDLE_MEMBER" as const, targetType: "PRODUCT" as const, productId: "burger", category: null },
        { role: "BUNDLE_MEMBER" as const, targetType: "PRODUCT" as const, productId: "fries", category: null },
      ],
    };
    const result = allocatePromotionToLines(promotion, lines, 230);
    expect(result?.discountTotal).toBe(31);
    expect(result?.nextLines.reduce((sum, line) => sum + line.revenue, 0)).toBe(199);
  });
});

describe("TIERED promotions", () => {
  it("applies best spend tier", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 2,
        unitSalePrice: 400,
        revenue: 800,
      },
    ];
    const promotion = {
      ...basePromotion,
      application: "AUTO" as const,
      kind: "TIERED_SPEND" as const,
      tieredConfig: {
        tiers: [
          { thresholdAmount: 500, thresholdQty: null, valueType: "PERCENT" as const, value: 5, sortOrder: 1 },
          { thresholdAmount: 1000, thresholdQty: null, valueType: "PERCENT" as const, value: 10, sortOrder: 2 },
        ],
      },
    };
    const result = allocatePromotionToLines(promotion, lines, 800);
    expect(result?.discountTotal).toBe(40);
  });

  it("applies best quantity tier", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 4,
        unitSalePrice: 100,
        revenue: 400,
      },
    ];
    const promotion = {
      ...basePromotion,
      application: "AUTO" as const,
      kind: "TIERED_QUANTITY" as const,
      tieredConfig: {
        tiers: [
          { thresholdAmount: null, thresholdQty: 3, valueType: "PERCENT" as const, value: 10, sortOrder: 1 },
        ],
      },
    };
    const result = allocatePromotionToLines(promotion, lines, 400);
    expect(result?.discountTotal).toBe(40);
  });
});

describe("promotion hints", () => {
  it("suggests next spend tier", () => {
    const hints = buildPromotionHints(
      [
        {
          ...basePromotion,
          application: "AUTO",
          kind: "TIERED_SPEND",
          tieredConfig: {
            tiers: [
              {
                thresholdAmount: 500,
                thresholdQty: null,
                valueType: "PERCENT",
                value: 5,
                sortOrder: 1,
              },
            ],
          },
        },
      ],
      [
        {
          productId: "a",
          productName: "A",
          category: "Food",
          quantity: 1,
          unitSalePrice: 300,
          revenue: 300,
        },
      ],
      300,
      "DINE_IN",
      new Set()
    );
    expect(hints[0]?.message).toBe("Add ₹200 more for 5% off");
  });
});

describe("CUSTOMER_SEGMENT promotions", () => {
  it("applies first-order segment discount", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 1,
        unitSalePrice: 200,
        revenue: 200,
      },
    ];
    const promotion = {
      ...basePromotion,
      application: "AUTO" as const,
      kind: "CUSTOMER_SEGMENT" as const,
      customerSegmentConfig: {
        segment: "FIRST_ORDER" as const,
        valueType: "PERCENT" as const,
        minVisitCount: 2,
      },
    };
    const result = applyPromotions([promotion], lines, 200, {
      channel: "DINE_IN",
      includeAuto: true,
      customerSegments: ["FIRST_ORDER"],
      deliveredOrderCount: 0,
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.discountTotal).toBe(20);
    }
  });
});

describe("payment method promotions", () => {
  it("applies cash-only promo when payment method matches", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 1,
        unitSalePrice: 100,
        revenue: 100,
      },
    ];
    const promotion = {
      ...basePromotion,
      application: "PAYMENT_METHOD" as const,
      kind: "CHECK_PERCENT" as const,
      value: 5,
      paymentMethods: ["CASH"] as import("@prisma/client").OrderPaymentMethod[],
    };
    const withoutPayment = applyPromotions([promotion], lines, 100, {
      channel: "DINE_IN",
      includeAuto: true,
    });
    const withCash = applyPromotions([promotion], lines, 100, {
      channel: "DINE_IN",
      includeAuto: true,
      paymentMethod: "CASH",
    });
    expect("error" in withoutPayment).toBe(false);
    expect("error" in withCash).toBe(false);
    if (!("error" in withoutPayment) && !("error" in withCash)) {
      expect(withoutPayment.discountTotal).toBe(0);
      expect(withCash.discountTotal).toBe(5);
    }
  });
});

describe("BEST_PRICE stacking", () => {
  it("picks the promotion with higher savings", () => {
    const lines = [
      {
        productId: "a",
        productName: "A",
        category: "Food",
        quantity: 1,
        unitSalePrice: 1000,
        revenue: 1000,
      },
    ];
    const promos = [
      {
        ...basePromotion,
        id: "p1",
        name: "5%",
        application: "AUTO" as const,
        value: 5,
        stackingPolicy: "BEST_PRICE" as const,
      },
      {
        ...basePromotion,
        id: "p2",
        name: "10%",
        application: "AUTO" as const,
        value: 10,
        stackingPolicy: "BEST_PRICE" as const,
        priority: 200,
      },
    ];
    const result = applyPromotions(promos, lines, 1000, {
      channel: "DINE_IN",
      includeAuto: true,
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.discountTotal).toBe(100);
      expect(result.appliedPromotions[0]?.name).toBe("10%");
    }
  });
});

describe("manager adjustments", () => {
  it("comps a line and applies manager open discount", () => {
    const lines = [
      {
        productId: "a",
        productName: "Burger",
        category: "Food",
        quantity: 1,
        unitSalePrice: 200,
        revenue: 200,
      },
      {
        productId: "b",
        productName: "Fries",
        category: "Food",
        quantity: 1,
        unitSalePrice: 100,
        revenue: 100,
      },
    ];

    const result = applyManagerAdjustments(
      lines,
      {
        compLines: [{ productId: "a", reason: "Wrong item" }],
        openDiscount: { mode: "PERCENT", value: 10, reason: "Guest wait" },
      },
      "user-1"
    );

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.applied).toHaveLength(2);
      expect(result.applied[0]?.kind).toBe("COMP_ITEM");
      expect(result.applied[1]?.kind).toBe("MANAGER_OPEN");
      expect(result.nextLines.find((line) => line.productId === "a")?.revenue).toBe(0);
      expect(result.nextLines.find((line) => line.productId === "b")?.revenue).toBe(90);
    }
  });

  it("rejects manager discount without reason", () => {
    const lines = [
      {
        productId: "a",
        productName: "Burger",
        category: "Food",
        quantity: 1,
        unitSalePrice: 200,
        revenue: 200,
      },
    ];
    const result = applyManagerAdjustments(lines, {
      openDiscount: { mode: "FIXED", value: 50, reason: "   " },
    });
    expect("error" in result).toBe(true);
  });
});

describe("estimatePromotionImpact", () => {
  it("estimates weekly and monthly discount cost", () => {
    const estimate = estimatePromotionImpact({
      promotion: basePromotion,
      avgOrderValue: 800,
      grossMarginRate: 0.55,
      expectedWeeklyRedemptions: 50,
      sampleOrderCount: 120,
    });
    expect(estimate.discountPerOrder).toBe(80);
    expect(estimate.weeklyDiscountCost).toBe(4000);
    expect(estimate.weeklyBreakEvenRevenue).toBeCloseTo(7272.73, 1);
  });
});
