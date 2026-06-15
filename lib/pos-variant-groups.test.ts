import { describe, expect, it } from "vitest";
import { buildPosVariantGroups, variantGroupFromPrice } from "@/lib/pos-variant-groups";

const base = {
  category: "Mains",
  salePrice: 100,
  yieldUnit: "KG",
};

describe("buildPosVariantGroups", () => {
  it("groups priced prep sell variants under parent prep", () => {
    const { groups, standalone } = buildPosVariantGroups([
      { id: "a", name: "Biryani — Single", parentPrepId: "prep1", variantLabel: "Single", variantSortOrder: 10, ...base },
      { id: "b", name: "Biryani — Family", parentPrepId: "prep1", variantLabel: "Family", variantSortOrder: 30, ...base, salePrice: 350 },
      { id: "c", name: "Lassi", parentPrepId: null, ...base, salePrice: 80 },
    ]);

    expect(standalone).toHaveLength(1);
    expect(standalone[0].id).toBe("c");
    expect(groups).toHaveLength(1);
    expect(groups[0].prepId).toBe("prep1");
    expect(groups[0].name).toBe("Biryani");
    expect(groups[0].variants.map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("excludes unpriced variants when pricedOnly is true", () => {
    const { groups } = buildPosVariantGroups([
      { id: "a", name: "Soup — Cup", parentPrepId: "prep1", variantLabel: "Cup", salePrice: null, category: "Soups", yieldUnit: "LT" },
    ]);
    expect(groups).toHaveLength(0);
  });

  it("includes unpriced variants when pricedOnly is false", () => {
    const { groups } = buildPosVariantGroups(
      [
        { id: "a", name: "Soup — Cup", parentPrepId: "prep1", variantLabel: "Cup", salePrice: null, category: "Soups", yieldUnit: "LT" },
      ],
      { pricedOnly: false }
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].variants[0].id).toBe("a");
  });
});

describe("variantGroupFromPrice", () => {
  it("returns lowest variant price", () => {
    expect(
      variantGroupFromPrice([
        { id: "1", name: "A", category: "X", salePrice: 120 },
        { id: "2", name: "B", category: "X", salePrice: 90 },
      ])
    ).toBe(90);
  });
});
