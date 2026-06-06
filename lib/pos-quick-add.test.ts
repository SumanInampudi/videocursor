import { describe, expect, it } from "vitest";
import { normalizePosQuickAddInput, parsePosQuickAdd } from "@/lib/pos-quick-add";

describe("parsePosQuickAdd", () => {
  it("parses code qty quantity", () => {
    expect(parsePosQuickAdd("1 qty 5")).toEqual({ posCode: 1, quantity: 5 });
    expect(parsePosQuickAdd("1 qty 1")).toEqual({ posCode: 1, quantity: 1 });
    expect(parsePosQuickAdd("12 qty 3")).toEqual({ posCode: 12, quantity: 3 });
  });

  it("parses spoken numbers", () => {
    expect(parsePosQuickAdd("one qty five")).toEqual({ posCode: 1, quantity: 5 });
    expect(parsePosQuickAdd("1 quantity 2")).toEqual({ posCode: 1, quantity: 2 });
  });

  it("parses single code as qty 1", () => {
    expect(parsePosQuickAdd("3")).toEqual({ posCode: 3, quantity: 1 });
  });

  it("parses x shorthand", () => {
    expect(parsePosQuickAdd("2 x 4")).toEqual({ posCode: 2, quantity: 4 });
  });

  it("returns null for invalid input", () => {
    expect(parsePosQuickAdd("egg biryani")).toBeNull();
    expect(parsePosQuickAdd("qty 1")).toBeNull();
  });
});

describe("normalizePosQuickAddInput", () => {
  it("converts number words", () => {
    expect(normalizePosQuickAddInput("One Qty Five")).toBe("1 qty 5");
  });
});
