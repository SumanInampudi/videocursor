import type { Prisma } from "@prisma/client";
import { Unit } from "@prisma/client";
import { effectiveCostPerUnit, normalizeWastagePercent, usableQuantity } from "@/lib/ingredient-wastage";
import { convertUnits, sumQuantityInUnit } from "@/lib/unit-conversion";

export type CostLayerSnapshot = {
  id: string;
  quantityRemaining: number | { toString(): string };
  costPerUnit: number | { toString(): string };
  unit: Unit;
  createdAt?: Date;
};

export type FifoConsumptionSlice = {
  inventoryItemId: string;
  costLayerId: string | null;
  quantityDeducted: number;
  unit: Unit;
  costPerUnit: number;
  lineCost: number;
};

function toNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : Number(value);
}

export function layersForItem(
  item: {
    id: string;
    quantity: { toString(): string } | number;
    unit: Unit;
    costPerUnit: { toString(): string } | number;
    costLayers?: CostLayerSnapshot[];
  }
): CostLayerSnapshot[] {
  if (item.costLayers && item.costLayers.length > 0) {
    return [...item.costLayers]
      .map((l) => ({
        id: l.id,
        quantityRemaining: toNumber(l.quantityRemaining),
        costPerUnit: toNumber(l.costPerUnit),
        unit: l.unit,
        createdAt: l.createdAt,
      }))
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }
  const qty = toNumber(item.quantity);
  if (qty <= 0) return [];
  return [
    {
      id: `virtual-${item.id}`,
      quantityRemaining: qty,
      costPerUnit: toNumber(item.costPerUnit),
      unit: item.unit,
    },
  ];
}

export function physicalQuantityForUnit(
  items: { unit: Unit; quantity: { toString(): string } | number; isActive: boolean }[],
  unit: Unit
): number {
  return sumQuantityInUnit(
    items.map((i) => ({
      quantity: i.quantity,
      unit: i.unit,
      isActive: i.isActive,
    })),
    unit
  );
}

/** Simulate FIFO deduction; returns slices with wastage-inflated line costs. */
export function planFifoConsumption(input: {
  needed: number;
  unit: Unit;
  wastagePercent: number | null | undefined;
  inventoryItems: {
    id: string;
    quantity: { toString(): string } | number;
    unit: Unit;
    costPerUnit: { toString(): string } | number;
    isActive: boolean;
    costLayers?: CostLayerSnapshot[];
  }[];
}): { ok: true; consumptions: FifoConsumptionSlice[]; totalCost: number } | { ok: false; error: string } {
  const waste = normalizeWastagePercent(input.wastagePercent);
  const matching = input.inventoryItems
    .filter(
      (i) =>
        i.isActive &&
        (i.unit === input.unit || convertUnits(1, i.unit, input.unit) != null)
    )
    .sort((a, b) => toNumber(b.quantity) - toNumber(a.quantity));

  const physical = physicalQuantityForUnit(matching, input.unit);
  const usable = usableQuantity(physical, waste);

  if (usable + 0.0001 < input.needed) {
    return {
      ok: false,
      error: `Insufficient usable stock: need ${input.needed} ${input.unit}, have ${usable.toFixed(2)} usable (${physical.toFixed(2)} physical, ${waste}% wastage)`,
    };
  }

  let remaining = input.needed;
  const consumptions: FifoConsumptionSlice[] = [];

  for (const item of matching) {
    if (remaining <= 0.0001) break;

    const layers = layersForItem(item);
    for (const layer of layers) {
      if (remaining <= 0.0001) break;
      const availableRaw = toNumber(layer.quantityRemaining);
      if (availableRaw <= 0) continue;

      const available =
        layer.unit === input.unit
          ? availableRaw
          : convertUnits(availableRaw, layer.unit, input.unit);
      if (available == null || available <= 0) continue;

      const take = Math.min(available, remaining);
      const baseCost = toNumber(layer.costPerUnit);
      const billedCost = effectiveCostPerUnit(baseCost, waste);

      consumptions.push({
        inventoryItemId: item.id,
        costLayerId: layer.id.startsWith("virtual-") ? null : layer.id,
        quantityDeducted: take,
        unit: input.unit,
        costPerUnit: billedCost,
        lineCost: take * billedCost,
      });
      remaining -= take;
    }
  }

  if (remaining > 0.0001) {
    return {
      ok: false,
      error: `Insufficient stock layers: short by ${remaining.toFixed(2)} ${input.unit}`,
    };
  }

  const totalCost = consumptions.reduce((s, c) => s + c.lineCost, 0);
  return { ok: true, consumptions, totalCost };
}

/** FIFO-based ingredient cost for one recipe line (pricing / estimates). */
export function estimateLineCostFifo(input: {
  requiredQty: number;
  unit: Unit;
  wastagePercent: number | null | undefined;
  inventoryItems: Parameters<typeof planFifoConsumption>[0]["inventoryItems"];
}): { cost: number; availableUsable: number } {
  const physical = physicalQuantityForUnit(input.inventoryItems, input.unit);
  const availableUsable = usableQuantity(physical, input.wastagePercent);

  if (availableUsable <= 0 || input.requiredQty <= 0) {
    return { cost: 0, availableUsable };
  }

  const plan = planFifoConsumption({
    needed: Math.min(input.requiredQty, availableUsable),
    unit: input.unit,
    wastagePercent: input.wastagePercent,
    inventoryItems: input.inventoryItems,
  });

  if (!plan.ok) return { cost: 0, availableUsable };

  if (input.requiredQty <= availableUsable + 0.0001) {
    return { cost: plan.totalCost, availableUsable };
  }

  const unitCost = plan.totalCost / Math.min(input.requiredQty, availableUsable);
  return { cost: unitCost * input.requiredQty, availableUsable };
}

export async function ensureCostLayers(
  tx: Prisma.TransactionClient,
  inventoryItemId: string
) {
  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: inventoryItemId },
    include: { costLayers: true },
  });

  const qty = toNumber(item.quantity);
  if (qty <= 0.0001) return;

  const layerSum = item.costLayers.reduce(
    (s, l) => s + toNumber(l.quantityRemaining),
    0
  );

  if (layerSum <= 0.0001) {
    await tx.inventoryCostLayer.create({
      data: {
        inventoryItemId,
        quantityRemaining: qty,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
      },
    });
    return;
  }

  if (Math.abs(layerSum - qty) > 0.01) {
    const diff = qty - layerSum;
    if (diff > 0.0001) {
      await tx.inventoryCostLayer.create({
        data: {
          inventoryItemId,
          quantityRemaining: diff,
          unit: item.unit,
          costPerUnit: item.costPerUnit,
        },
      });
    }
  }
}

export async function createCostLayer(
  tx: Prisma.TransactionClient,
  input: {
    inventoryItemId: string;
    quantity: number;
    unit: Unit;
    costPerUnit: number;
    receiveBatchId?: string | null;
  }
) {
  if (input.quantity <= 0) return;
  await tx.inventoryCostLayer.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      quantityRemaining: input.quantity,
      unit: input.unit,
      costPerUnit: input.costPerUnit,
      receiveBatchId: input.receiveBatchId ?? null,
    },
  });
}

function costsDiffer(a: number, b: number) {
  return Math.abs(a - b) > 0.0001;
}

/** On-hand value from FIFO layers, falling back to item snapshot when layers are empty. */
async function onHandLayerValue(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  fallbackQty: number,
  fallbackCost: number
) {
  const layers = await tx.inventoryCostLayer.findMany({
    where: { inventoryItemId, quantityRemaining: { gt: 0 } },
  });

  let qty = 0;
  let value = 0;
  for (const layer of layers) {
    const q = toNumber(layer.quantityRemaining);
    qty += q;
    value += q * toNumber(layer.costPerUnit);
  }

  if (qty <= 0.0001) {
    return { qty: fallbackQty, value: fallbackQty * fallbackCost };
  }

  return { qty, value };
}

/**
 * Restock cost layers: same unit cost → FIFO batch; price change → weighted average
 * collapsed into a single layer.
 */
export async function receiveCostLayers(
  tx: Prisma.TransactionClient,
  input: {
    inventoryItemId: string;
    previousQty: number;
    receiveQty: number;
    unit: Unit;
    previousCost: number;
    receiveCost: number;
    receiveBatchId?: string | null;
  }
): Promise<{ costPerUnit: number; usedAverage: boolean }> {
  const {
    inventoryItemId,
    previousQty,
    receiveQty,
    unit,
    previousCost,
    receiveCost,
    receiveBatchId,
  } = input;

  if (receiveQty <= 0) {
    return { costPerUnit: previousCost, usedAverage: false };
  }

  const newTotalQty = previousQty + receiveQty;
  const priceChanged = costsDiffer(previousCost, receiveCost);
  const useAverage = priceChanged && previousQty > 0.0001;

  if (!useAverage) {
    await createCostLayer(tx, {
      inventoryItemId,
      quantity: receiveQty,
      unit,
      costPerUnit: receiveCost,
      receiveBatchId,
    });
    await syncDisplayCostFromLayers(tx, inventoryItemId);
    const item = await tx.inventoryItem.findUniqueOrThrow({
      where: { id: inventoryItemId },
      select: { costPerUnit: true },
    });
    return { costPerUnit: toNumber(item.costPerUnit), usedAverage: false };
  }

  const { qty: onHandQty, value: onHandValue } = await onHandLayerValue(
    tx,
    inventoryItemId,
    previousQty,
    previousCost
  );
  const averageCost = (onHandValue + receiveQty * receiveCost) / (onHandQty + receiveQty);

  await tx.inventoryCostLayer.deleteMany({ where: { inventoryItemId } });
  await tx.inventoryCostLayer.create({
    data: {
      inventoryItemId,
      quantityRemaining: newTotalQty,
      unit,
      costPerUnit: averageCost,
      receiveBatchId: receiveBatchId ?? null,
    },
  });

  await tx.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { costPerUnit: averageCost },
  });

  return { costPerUnit: averageCost, usedAverage: true };
}

/** Manual inventory edit: stock-in uses receive rules; cost-only change revalues layers. */
export async function applyManualInventoryCostUpdate(
  tx: Prisma.TransactionClient,
  input: {
    inventoryItemId: string;
    previousQty: number;
    previousCost: number;
    newQty: number;
    newCost: number;
    unit: Unit;
  }
): Promise<{ costPerUnit: number; usedAverage: boolean; note?: string }> {
  const { inventoryItemId, previousQty, previousCost, newQty, newCost, unit } = input;
  const qtyDelta = newQty - previousQty;
  const costChanged = costsDiffer(previousCost, newCost);

  if (qtyDelta > 0.0001) {
    const result = await receiveCostLayers(tx, {
      inventoryItemId,
      previousQty,
      receiveQty: qtyDelta,
      unit,
      previousCost,
      receiveCost: newCost,
    });
    return {
      costPerUnit: result.costPerUnit,
      usedAverage: result.usedAverage,
      note: result.usedAverage
        ? "Updated from inventory form (weighted average)"
        : "Updated from inventory form",
    };
  }

  if (costChanged) {
    await tx.inventoryCostLayer.deleteMany({ where: { inventoryItemId } });
    if (newQty > 0.0001) {
      await tx.inventoryCostLayer.create({
        data: {
          inventoryItemId,
          quantityRemaining: newQty,
          unit,
          costPerUnit: newCost,
        },
      });
    }
    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { costPerUnit: newCost },
    });
    return {
      costPerUnit: newCost,
      usedAverage: false,
      note: "Updated from inventory form (cost revaluation)",
    };
  }

  await syncDisplayCostFromLayers(tx, inventoryItemId);
  const item = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: inventoryItemId },
    select: { costPerUnit: true },
  });
  return { costPerUnit: toNumber(item.costPerUnit), usedAverage: false };
}

export async function syncDisplayCostFromLayers(
  tx: Prisma.TransactionClient,
  inventoryItemId: string
) {
  const layers = await tx.inventoryCostLayer.findMany({
    where: { inventoryItemId, quantityRemaining: { gt: 0 } },
  });

  if (layers.length === 0) return;

  let totalQty = 0;
  let totalValue = 0;
  for (const layer of layers) {
    const q = toNumber(layer.quantityRemaining);
    totalQty += q;
    totalValue += q * toNumber(layer.costPerUnit);
  }

  await tx.inventoryItem.update({
    where: { id: inventoryItemId },
    data: {
      costPerUnit: totalQty > 0 ? totalValue / totalQty : 0,
    },
  });
}

function deductInUnit(
  amount: number,
  from: Unit,
  to: Unit,
  context: string
): number {
  if (from === to) return amount;
  const converted = convertUnits(amount, from, to);
  if (converted == null) {
    throw new Error(`Unit conversion failed for ${context}: ${from} → ${to}`);
  }
  return converted;
}

export async function applyFifoConsumptions(
  tx: Prisma.TransactionClient,
  consumptions: FifoConsumptionSlice[]
) {
  const itemQtyDeducted = new Map<string, number>();

  for (const c of consumptions) {
    if (c.costLayerId) {
      const layer = await tx.inventoryCostLayer.findUniqueOrThrow({
        where: { id: c.costLayerId },
      });
      const deductFromLayer = deductInUnit(
        c.quantityDeducted,
        c.unit,
        layer.unit,
        `layer ${c.costLayerId}`
      );
      const remaining = toNumber(layer.quantityRemaining) - deductFromLayer;
      if (remaining < -0.0001) {
        throw new Error("FIFO layer quantity conflict");
      }
      await tx.inventoryCostLayer.update({
        where: { id: c.costLayerId },
        data: { quantityRemaining: Math.max(0, remaining) },
      });
    }

    const item = await tx.inventoryItem.findUniqueOrThrow({
      where: { id: c.inventoryItemId },
    });
    const deductFromItem = deductInUnit(
      c.quantityDeducted,
      c.unit,
      item.unit,
      `item ${c.inventoryItemId}`
    );
    itemQtyDeducted.set(
      c.inventoryItemId,
      (itemQtyDeducted.get(c.inventoryItemId) ?? 0) + deductFromItem
    );
  }

  for (const [inventoryItemId, totalDeducted] of itemQtyDeducted) {
    const item = await tx.inventoryItem.findUniqueOrThrow({
      where: { id: inventoryItemId },
    });
    const newQty = toNumber(item.quantity) - totalDeducted;
    if (newQty < -0.0001) throw new Error("Stock quantity conflict");
    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantity: Math.max(0, newQty) },
    });
  }
}
