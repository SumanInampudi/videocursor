import { describe, expect, it } from "vitest";
import { coerceUnit, normalizeUnit, UNITS } from "./units";

describe("units", () => {
  it("exposes only the five fixed units", () => {
    expect(UNITS).toEqual(["KG", "GM", "LT", "ML", "Pcs"]);
  });

  it("coerces legacy aliases", () => {
    expect(coerceUnit("kg")).toBe("KG");
    expect(coerceUnit("g")).toBe("GM");
    expect(coerceUnit("L")).toBe("LT");
    expect(coerceUnit("ml")).toBe("ML");
    expect(coerceUnit("pcs")).toBe("Pcs");
  });

  it("rejects unknown units", () => {
    expect(coerceUnit("servings")).toBeNull();
    expect(coerceUnit("oz")).toBe("GM");
  });

  it("normalizes with default", () => {
    expect(normalizeUnit("")).toBe("GM");
    expect(normalizeUnit("KG")).toBe("KG");
  });
});
