"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { STARTER_INGREDIENTS, normalizeIngredientName } from "@/lib/ingredients";
import { serializeForClient } from "@/lib/serialize";
import type { ReceiveCatalogItem } from "@/lib/stock-receive-cart";
import { recordStockReceiveExpense } from "@/lib/stock-receive-finance";
import { stockReceiveSchema } from "@/lib/validations";
import { Prisma, PurchasePaymentStatus, Unit } from "@prisma/client";

const REVALIDATE_PATHS = [
  "/",
  "/inventory",
  "/inventory/receive",
  "/inventory/payables",
  "/inventory/purchases/new",
  "/ingredients",
  "/yield",
  "/recipes",
  "/expenses",
  "/reports",
];

function revalidateStock() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

function resolveAmountPaid(
  status: PurchasePaymentStatus,
  totalAmount: number,
  amountPaidInput?: number
): number {
  if (status === "PAID") return totalAmount;
  if (status === "CREDIT") return 0;
  return amountPaidInput ?? 0;
}

async function recordCostHistory(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  costPerUnit: number,
  previousCost: number | null,
  note?: string
) {
  await tx.inventoryCostHistory.create({
    data: {
      inventoryItemId,
      costPerUnit,
      previousCost,
      note: note ?? null,
    },
  });
}

async function ensureInventoryItem(
  tx: Prisma.TransactionClient,
  businessId: string,
  ingredientId: string
) {
  const ingredient = await tx.ingredient.findFirst({
    where: { id: ingredientId, businessId, isActive: true },
  });
  if (!ingredient) {
    throw new Error("Ingredient not found");
  }

  let item = await tx.inventoryItem.findFirst({
    where: { businessId, ingredientId },
  });

  if (!item) {
    item = await tx.inventoryItem.create({
      data: {
        businessId,
        ingredientId,
        name: ingredient.name,
        sku: `${ingredient.sku}-STK`,
        category: ingredient.category,
        quantity: 0,
        unit: ingredient.defaultUnit,
        reorderLevel: 0,
        costPerUnit: 0,
        isActive: true,
      },
    });
    await recordCostHistory(tx, item.id, 0, null, "Initial cost");
  }

  return { ingredient, item };
}

export async function getReceiveCatalog() {
  const { businessId } = await requireBusinessContext();

  const ingredients = await db.ingredient.findMany({
    where: { businessId, isActive: true },
    include: {
      inventoryItems: {
        where: { isActive: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentPurchases = await db.inventoryPurchase.findMany({
    where: {
      purchaseDate: { gte: thirtyDaysAgo },
      inventoryItem: { businessId },
    },
    select: {
      inventoryItem: { select: { ingredientId: true } },
    },
    orderBy: { purchaseDate: "desc" },
    take: 200,
  });

  const frequentFromPurchases: string[] = [];
  const seenFreq = new Set<string>();
  for (const p of recentPurchases) {
    const ingId = p.inventoryItem?.ingredientId;
    if (ingId && !seenFreq.has(ingId)) {
      seenFreq.add(ingId);
      frequentFromPurchases.push(ingId);
    }
  }

  const starterNames = new Set(
    STARTER_INGREDIENTS.map((s) => normalizeIngredientName(s.name))
  );
  const starterIds = ingredients
    .filter((i) => starterNames.has(i.normalizedName))
    .map((i) => i.id);

  const frequentIds = [
    ...frequentFromPurchases,
    ...starterIds.filter((id) => !seenFreq.has(id)),
  ].slice(0, 24);

  const categories = [...new Set(ingredients.map((i) => i.category))].sort();

  const catalog: ReceiveCatalogItem[] = ingredients.map((ing) => {
    const stock = ing.inventoryItems[0];
    return {
      id: ing.id,
      name: ing.name,
      category: ing.category,
      defaultUnit: ing.defaultUnit,
      inventoryItemId: stock?.id ?? null,
      lastUnitCost: stock ? Number(stock.costPerUnit) : 0,
      stockQty: stock ? Number(stock.quantity) : null,
      stockUnit: stock?.unit ?? null,
    };
  });

  return serializeForClient({ catalog, categories, frequentIds });
}

export async function postStockReceive(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const lineCount = parseInt(String(raw.lineCount || "0"), 10);
  const lines = [];

  for (let i = 0; i < lineCount; i++) {
    lines.push({
      ingredientId: String(raw[`line_${i}_ingredientId`] || ""),
      quantity: raw[`line_${i}_quantity`],
      unitCost: raw[`line_${i}_unitCost`],
      unit: String(raw[`line_${i}_unit`] || "g"),
    });
  }

  const parsed = stockReceiveSchema.safeParse({
    supplierId: raw.supplierId || undefined,
    paymentStatus: raw.paymentStatus,
    amountPaid: raw.amountPaid || undefined,
    purchaseDate: raw.purchaseDate,
    dueDate: raw.dueDate || undefined,
    notes: raw.notes || undefined,
    invoiceRef: raw.invoiceRef || undefined,
    lines,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessId } = await requireBusinessContext();
  const data = parsed.data;
  const status = data.paymentStatus as PurchasePaymentStatus;
  const grandTotal = data.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const amountPaid = resolveAmountPaid(status, grandTotal, data.amountPaid);

  let supplierName: string | null = null;
  let supplierId: string | null = data.supplierId || null;
  if (supplierId) {
    const sup = await db.supplier.findFirst({
      where: { id: supplierId, businessId },
      select: { name: true },
    });
    if (!sup) {
      return { error: { supplierId: ["Supplier not found"] } };
    }
    supplierName = sup.name;
  }

  const purchaseDate = new Date(data.purchaseDate);
  const dueDate = data.dueDate ? new Date(data.dueDate) : null;
  const headerNote = [
    data.invoiceRef?.trim() ? `Ref: ${data.invoiceRef.trim()}` : null,
    data.notes?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    await db.$transaction(async (tx) => {
      for (const line of data.lines) {
        const { ingredient, item } = await ensureInventoryItem(
          tx,
          businessId,
          line.ingredientId
        );

        const receiveUnit = line.unit as Unit;
        const previousCost = Number(item.costPerUnit);
        const previousQty = Number(item.quantity);
        const newQty = previousQty + line.quantity;
        const newCost = line.unitCost;
        const costChanged = Math.abs(previousCost - newCost) > 0.0001;
        const lineTotal = line.quantity * line.unitCost;

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            quantity: newQty,
            unit: receiveUnit,
            costPerUnit: newCost,
            ...(supplierId ? { supplierId } : {}),
            ...(supplierName ? { supplier: supplierName } : {}),
          },
        });

        if (costChanged) {
          await recordCostHistory(
            tx,
            item.id,
            newCost,
            previousCost,
            "Stock receive"
          );
        }

        const description = `Receive: ${ingredient.name} (${line.quantity} ${receiveUnit})`;
        const lineAmountPaid =
          status === "PAID"
            ? lineTotal
            : status === "CREDIT"
              ? 0
              : grandTotal > 0
                ? (amountPaid / grandTotal) * lineTotal
                : 0;

        await tx.inventoryPurchase.create({
          data: {
            inventoryItemId: item.id,
            supplierId,
            description,
            supplier: supplierName,
            totalAmount: lineTotal,
            amountPaid: lineAmountPaid,
            paymentStatus: status,
            purchaseDate,
            dueDate,
            notes: headerNote || null,
          },
        });
      }

      await recordStockReceiveExpense(tx, {
        businessId,
        purchaseDate,
        grandTotal,
        amountPaid,
        supplierName,
        lineCount: data.lines.length,
        invoiceRef: data.invoiceRef,
        headerNote,
      });
    });
  } catch (e) {
    return {
      error: {
        lines: [e instanceof Error ? e.message : "Could not post receive"],
      },
    };
  }

  const creditOwed = Math.max(0, grandTotal - amountPaid);

  revalidateStock();
  return {
    success: true,
    lineCount: data.lines.length,
    total: grandTotal,
    amountPaid,
    creditOwed,
    expenseRecorded: amountPaid > 0,
  };
}
