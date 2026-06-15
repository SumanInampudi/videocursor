import { describe, expect, it } from "vitest";
import { buildKitchenPrepAggregate } from "@/lib/kitchen-kds";

describe("buildKitchenPrepAggregate", () => {
  it("sums pending qty for the same product across tickets", () => {
    const rows = buildKitchenPrepAggregate([
      {
        id: "o1",
        orderNumber: "A-001",
        status: "NEW",
        lineItems: [
          {
            id: "l1",
            quantity: 1,
            productName: "Egg Biryani",
            addedAt: new Date(),
            product: { id: "p1", name: "Egg Biryani" },
          },
        ],
      },
      {
        id: "o2",
        orderNumber: "A-002",
        status: "PROCESSING",
        lineItems: [
          {
            id: "l2",
            quantity: 2,
            productName: "Egg Biryani",
            addedAt: new Date(),
            kitchenDoneQty: 1,
            product: { id: "p1", name: "Egg Biryani" },
          },
          {
            id: "l3",
            quantity: 1,
            productName: "Raita",
            addedAt: new Date(),
            product: { id: "p2", name: "Raita" },
          },
        ],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      key: "p1",
      productName: "Egg Biryani",
      pendingQty: 2,
      tickets: [
        { orderId: "o1", pendingQty: 1 },
        { orderId: "o2", pendingQty: 1 },
      ],
    });
    expect(rows[1]).toMatchObject({
      key: "p2",
      productName: "Raita",
      pendingQty: 1,
    });
  });

  it("ignores fully done lines", () => {
    const rows = buildKitchenPrepAggregate([
      {
        id: "o1",
        orderNumber: "A-001",
        status: "PROCESSING",
        lineItems: [
          {
            id: "l1",
            quantity: 2,
            productName: "Egg Biryani",
            addedAt: new Date(),
            kitchenDoneQty: 2,
            product: { id: "p1", name: "Egg Biryani" },
          },
        ],
      },
    ]);

    expect(rows).toHaveLength(0);
  });

  it("merges multiple lines for the same product on one ticket", () => {
    const rows = buildKitchenPrepAggregate([
      {
        id: "o1",
        orderNumber: "A-001",
        status: "NEW",
        lineItems: [
          {
            id: "l1",
            quantity: 1,
            productName: "Egg Biryani",
            addedAt: new Date(),
            product: { id: "p1", name: "Egg Biryani" },
          },
          {
            id: "l2",
            quantity: 2,
            productName: "Egg Biryani",
            addedAt: new Date(),
            product: { id: "p1", name: "Egg Biryani" },
          },
        ],
      },
    ]);

    expect(rows[0]?.pendingQty).toBe(3);
    expect(rows[0]?.tickets).toHaveLength(1);
    expect(rows[0]?.tickets[0]?.pendingQty).toBe(3);
  });
});
