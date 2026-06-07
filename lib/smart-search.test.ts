import { describe, expect, it } from "vitest";
import {
  filterAndRankSmartSearch,
  smartMatches,
  smartSearchScore,
} from "@/lib/smart-search";

describe("smartSearchScore", () => {
  it("ranks exact name matches above fuzzy matches", () => {
    const exact = smartSearchScore(["Basmati rice", "BAS-001"], "basmati rice");
    const fuzzy = smartSearchScore(["Basmati rice", "BAS-001"], "basmti");
    expect(exact).toBeGreaterThan(fuzzy);
    expect(fuzzy).toBeGreaterThan(0);
  });

  it("supports typo tolerance", () => {
    expect(smartMatches(["Sprite 300ml"], "sprte")).toBe(true);
  });

  it("requires all terms to match", () => {
    expect(smartMatches(["Basmati rice"], "basmati wheat")).toBe(false);
    expect(smartMatches(["Basmati rice"], "basmati rice")).toBe(true);
  });
});

describe("filterAndRankSmartSearch", () => {
  const items = [
    { id: "1", name: "Basmati rice" },
    { id: "2", name: "Brown rice" },
    { id: "3", name: "Rice flour" },
  ];

  it("orders prefix matches before substring matches", () => {
    const ranked = filterAndRankSmartSearch(items, "rice", (item) => [item.name]);
    expect(ranked.map((i) => i.name)).toEqual([
      "Rice flour",
      "Basmati rice",
      "Brown rice",
    ]);
  });
});
