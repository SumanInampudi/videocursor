import { randomUUID } from "crypto";
import { formatCalendarDateString, parseCalendarDateString } from "@/lib/dates";
import type { Prisma, Unit } from "@prisma/client";

/** Audit row for manual inventory form edits (shown in receive history). */
export async function recordManualInventoryAdjustment(
  tx: Prisma.TransactionClient,
  input: {
    inventoryItemId: string;
    itemName: string;
    unit: Unit;
    previousQty: number;
    newQty: number;
    previousCost: number;
    newCost: number;
    supplierId?: string | null;
    supplierName?: string | null;
  }
) {
  const qtyChanged = Math.abs(input.previousQty - input.newQty) > 0.0001;
  const costChanged = Math.abs(input.previousCost - input.newCost) > 0.0001;
  if (!qtyChanged && !costChanged) return;

  const parts: string[] = [];
  if (qtyChanged) {
    parts.push(`qty ${input.previousQty} → ${input.newQty} ${input.unit}`);
  }
  if (costChanged) {
    parts.push(
      `cost ${input.previousCost.toFixed(2)} → ${input.newCost.toFixed(2)} per ${input.unit}`
    );
  }

  const qtyDelta = input.newQty - input.previousQty;
  const valueEstimate = qtyDelta > 0 ? qtyDelta * input.newCost : 0;

  await tx.inventoryPurchase.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      supplierId: input.supplierId ?? null,
      receiveBatchId: randomUUID(),
      description: `Manual: ${input.itemName} (${parts.join("; ")})`,
      supplier: input.supplierName ?? null,
      totalAmount: valueEstimate,
      amountPaid: 0,
      paymentStatus: "PAID",
      purchaseDate: parseCalendarDateString(formatCalendarDateString(new Date())),
      notes: "Inventory form edit",
    },
  });
}
