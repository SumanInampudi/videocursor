import { describe, expect, it } from "vitest";
import { getCounterNextAction, getKitchenNextAction } from "@/lib/order-pipeline";

describe("getCounterNextAction", () => {
  it("mirrors kitchen pipeline labels for retail-only tickets", () => {
    expect(getCounterNextAction("NEW", "ONLINE")).toEqual({
      label: "Start picking",
      status: "PROCESSING",
    });
    expect(getCounterNextAction("PROCESSING", "ONLINE")).toEqual({
      label: "Bag",
      status: "PACKING",
    });
    expect(getCounterNextAction("READY", "ONLINE")).toEqual({
      label: "Picked up",
      status: "DELIVERED",
    });
  });

  it("skips packing for dine-in like kitchen", () => {
    expect(getCounterNextAction("PROCESSING", "DINE_IN")).toEqual({
      label: "Ready for pickup",
      status: "READY",
    });
    expect(getKitchenNextAction("PROCESSING", "DINE_IN")).toEqual({
      label: "Ready (deduct stock)",
      status: "READY",
    });
  });
});
