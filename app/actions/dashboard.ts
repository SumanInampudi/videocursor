"use server";

import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";

export async function getLowStockItems(limit = 8) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const items = await db.inventoryItem.findMany({
    where: { businessId, isActive: true },
    orderBy: { quantity: "asc" },
    take: 50,
  });

  const low = items
    .filter((item) => Number(item.quantity) <= Number(item.reorderLevel))
    .slice(0, limit);

  return serializeForClient(
    low.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: Number(item.quantity),
      reorderLevel: Number(item.reorderLevel),
      unit: item.unit,
    }))
  );
}
