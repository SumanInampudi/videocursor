import type { Unit } from "@prisma/client";

export type ReceiveCatalogItem = {
  id: string;
  name: string;
  category: string;
  defaultUnit: Unit;
  inventoryItemId: string | null;
  lastUnitCost: number;
  stockQty: number | null;
  stockUnit: Unit | null;
};

export type ReceiveCartLine = {
  ingredientId: string;
  name: string;
  unit: Unit;
  quantity: number;
  unitCost: number;
  inventoryItemId: string | null;
};

export function addToReceiveCart(
  cart: ReceiveCartLine[],
  item: ReceiveCatalogItem,
  qty = 1
): ReceiveCartLine[] {
  const unitCost = item.lastUnitCost > 0 ? item.lastUnitCost : 0;
  const unit = item.stockUnit ?? item.defaultUnit;
  const existing = cart.find((l) => l.ingredientId === item.id);
  if (existing) {
    return cart.map((l) =>
      l.ingredientId === item.id ? { ...l, quantity: l.quantity + qty } : l
    );
  }
  return [
    ...cart,
    {
      ingredientId: item.id,
      name: item.name,
      unit,
      quantity: qty,
      unitCost,
      inventoryItemId: item.inventoryItemId,
    },
  ];
}

export function updateReceiveLineQty(
  cart: ReceiveCartLine[],
  ingredientId: string,
  quantity: number
): ReceiveCartLine[] {
  if (quantity <= 0) return cart.filter((l) => l.ingredientId !== ingredientId);
  return cart.map((l) => (l.ingredientId === ingredientId ? { ...l, quantity } : l));
}

export function updateReceiveLineUnitCost(
  cart: ReceiveCartLine[],
  ingredientId: string,
  unitCost: number
): ReceiveCartLine[] {
  return cart.map((l) =>
    l.ingredientId === ingredientId ? { ...l, unitCost: Math.max(0, unitCost) } : l
  );
}

export function receiveCartTotal(cart: ReceiveCartLine[]) {
  return cart.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
}

export function buildReceiveFormData(
  cart: ReceiveCartLine[],
  fields: {
    supplierId?: string;
    paymentStatus: string;
    amountPaid?: number;
    purchaseDate: string;
    dueDate?: string;
    notes?: string;
    invoiceRef?: string;
  }
): FormData {
  const formData = new FormData();
  if (fields.supplierId) formData.set("supplierId", fields.supplierId);
  formData.set("paymentStatus", fields.paymentStatus);
  if (fields.amountPaid != null) formData.set("amountPaid", String(fields.amountPaid));
  formData.set("purchaseDate", fields.purchaseDate);
  if (fields.dueDate) formData.set("dueDate", fields.dueDate);
  if (fields.notes) formData.set("notes", fields.notes);
  if (fields.invoiceRef) formData.set("invoiceRef", fields.invoiceRef);
  formData.set("lineCount", String(cart.length));
  cart.forEach((line, i) => {
    formData.set(`line_${i}_ingredientId`, line.ingredientId);
    formData.set(`line_${i}_quantity`, String(line.quantity));
    formData.set(`line_${i}_unitCost`, String(line.unitCost));
    formData.set(`line_${i}_unit`, line.unit);
  });
  return formData;
}
