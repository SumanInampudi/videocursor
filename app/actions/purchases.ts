"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { inventoryPurchaseSchema } from "@/lib/validations";
import { PurchasePaymentStatus } from "@prisma/client";

const PATHS = ["/inventory", "/inventory/payables", "/inventory/purchases/new", "/"];

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
  return db.inventoryPurchase.findMany({
    where: {
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
  const open = await db.inventoryPurchase.findMany({
    where: { paymentStatus: { in: ["CREDIT", "PARTIAL"] } },
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

  return { purchases: open, totalOwed, count: open.length };
}

export async function getInventoryItemsForPurchase() {
  return db.inventoryItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true, supplier: true },
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

  const data = parsed.data;
  const status = data.paymentStatus as PurchasePaymentStatus;
  const amountPaid = resolveAmountPaid(status, data.totalAmount, data.amountPaid);

  await db.inventoryPurchase.create({
    data: {
      inventoryItemId: data.inventoryItemId || null,
      description: data.description,
      supplier: data.supplier || null,
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
