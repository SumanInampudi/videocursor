import { describe, expect, it } from "vitest";
import {
  buildDisplayCartLines,
  expandPaidLinesWithInclusions,
  formatIncludedProductName,
} from "@/lib/product-inclusions";

describe("expandPaidLinesWithInclusions", () => {
  it("adds merged included lines at zero price context", () => {
    const expanded = expandPaidLinesWithInclusions(
      [
        { productId: "biryani", quantity: 1 },
        { productId: "biryani", quantity: 1 },
      ],
      {
        biryani: [
          {
            includedProductId: "raita",
            includedProductName: "Raita",
            quantityPerParent: 1,
          },
        ],
      }
    );

    expect(expanded.filter((l) => !l.isIncluded)).toHaveLength(2);
    const raita = expanded.find((l) => l.isIncluded);
    expect(raita).toMatchObject({
      productId: "raita",
      productName: formatIncludedProductName("Raita"),
      quantity: 2,
    });
  });
});

describe("buildDisplayCartLines", () => {
  it("shows included companions under paid cart lines", () => {
    const display = buildDisplayCartLines(
      [{ productId: "biryani", name: "Egg Biryani", quantity: 2, unitPrice: 250 }],
      {
        biryani: [
          {
            includedProductId: "raita",
            includedProductName: "Raita",
            quantityPerParent: 1,
          },
        ],
      }
    );

    expect(display).toHaveLength(2);
    expect(display[1]).toMatchObject({
      productId: "raita",
      name: "Raita (included)",
      quantity: 2,
      unitPrice: 0,
      isIncluded: true,
    });
  });
});
