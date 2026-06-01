"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { inventoryPurchaseSchema } from "@/lib/validations";
import { PurchasePaymentStatus } from "@prisma/client";

const PATHS = [
  "/inventory",
  "/inventory/receive",
  "/inventory/payables",
  "/inventory/purchases/new",
  "/",
];

function revalidatePurchases() {
  for (const path of PATHS) {
    revalidatePath(path);
  }
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

export async function getInventoryPurchases(filters?: {
  openOnly?: boolean;
  inventoryItemId?: string;
}) {
  const { businessId } = await requireBusinessContext();
  return db.inventoryPurchase.findMany({
    where: {
      inventoryItem: { businessId },
      ...(filters?.openOnly
        ? { paymentStatus: { in: ["CREDIT", "PARTIAL"] } }
        : {}),
      ...(filters?.inventoryItemId
        ? { inventoryItemId: filters.inventoryItemId }
        : {}),
    },
    include: {
      inventoryItem: { select: { id: true, name: true, sku: true } },
    },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPayablesSummary() {
  const { businessId } = await requireBusinessContext();
  const open = await db.inventoryPurchase.findMany({
    where: {
      paymentStatus: { in: ["CREDIT", "PARTIAL"] },
      inventoryItem: { businessId },
    },
    select: {
      id: true,
      description: true,
      supplier: true,
      totalAmount: true,
      amountPaid: true,
      dueDate: true,
      purchaseDate: true,
      paymentStatus: true,
      inventoryItem: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const totalOwed = open.reduce(
    (sum, p) => sum + Math.max(0, Number(p.totalAmount) - Number(p.amountPaid)),
    0
  );

  return serializeForClient({ purchases: open, totalOwed, count: open.length });
}

export async function getInventoryItemsForPurchase() {
  const { businessId } = await requireBusinessContext();
  return db.inventoryItem.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true, sku: true, supplier: true, supplierId: true },
    orderBy: { name: "asc" },
  });
}

export async function createInventoryPurchase(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inventoryPurchaseSchema.safeParse({
    ...raw,
    inventoryItemId: raw.inventoryItemId || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessId } = await requireBusinessContext();
  const data = parsed.data;
  const status = data.paymentStatus as PurchasePaymentStatus;
  const amountPaid = resolveAmountPaid(status, data.totalAmount, data.amountPaid);

  let supplierName = data.supplier || null;
  if (data.supplierId) {
    const sup = await db.supplier.findFirst({
      where: { id: data.supplierId, businessId },
      select: { name: true },
    });
    if (sup) supplierName = sup.name;
  }

  if (data.inventoryItemId) {
    const item = await db.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, businessId },
    });
    if (!item) {
      return { error: { inventoryItemId: ["Inventory item not found"] } };
    }
  }

  await db.inventoryPurchase.create({
    data: {
      inventoryItemId: data.inventoryItemId || null,
      supplierId: data.supplierId || null,
      description: data.description,
      supplier: supplierName,
      totalAmount: data.totalAmount,
      amountPaid,
      paymentStatus: status,
      purchaseDate: new Date(data.purchaseDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
    },
  });

  revalidatePurchases();
  return { success: true };
}

export async function recordPurchasePayment(id: string, formData: FormData) {
  const amount = parseFloat(String(formData.get("amount") || "0"));
  if (amount <= 0) {
    return { error: { amount: ["Enter a payment amount"] } };
  }

  const purchase = await db.inventoryPurchase.findUnique({ where: { id } });
  if (!purchase) return { error: "Purchase not found" };

  const newPaid = Number(purchase.amountPaid) + amount;
  const total = Number(purchase.totalAmount);

  if (newPaid > total + 0.001) {
    return { error: { amount: ["Payment exceeds balance owed"] } };
  }

  const paymentStatus: PurchasePaymentStatus =
    newPaid >= total - 0.001 ? "PAID" : "PARTIAL";

  await db.inventoryPurchase.update({
    where: { id },
    data: {
      amountPaid: Math.min(newPaid, total),
      paymentStatus,
    },
  });

  revalidatePurchases();
  return { success: true };
}

export async function deleteInventoryPurchase(id: string) {
  await db.inventoryPurchase.delete({ where: { id } });
  revalidatePurchases();
  return { success: true };
}
