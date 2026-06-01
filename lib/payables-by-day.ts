export type PayablePurchaseRow = {
  id: string;
  description: string;
  supplier: string | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  purchaseDate: string;
  dueDate: string | null;
  paymentStatus: string;
};

export type PayablesByDayGroup = {
  date: string;
  totalOwed: number;
  purchases: PayablePurchaseRow[];
};

export type PayablesBySupplierGroup = {
  supplier: string;
  totalOwed: number;
  byDay: PayablesByDayGroup[];
};

/** Group open purchases by supplier, then by purchase date (day). */
export function groupPayablesBySupplierAndDay(
  rows: {
    id: string;
    description: string;
    supplier: string | null;
    totalAmount: number | { toString(): string };
    amountPaid: number | { toString(): string };
    purchaseDate: Date | string;
    dueDate: Date | string | null;
    paymentStatus: string;
  }[]
): PayablesBySupplierGroup[] {
  const supplierMap = new Map<string, PayablePurchaseRow[]>();

  for (const p of rows) {
    const balance = Math.max(0, Number(p.totalAmount) - Number(p.amountPaid));
    if (balance <= 0.0001) continue;

    const supplier = p.supplier?.trim() || "Unknown supplier";
    const row: PayablePurchaseRow = {
      id: p.id,
      description: p.description,
      supplier: p.supplier,
      totalAmount: Number(p.totalAmount),
      amountPaid: Number(p.amountPaid),
      balance,
      purchaseDate:
        typeof p.purchaseDate === "string"
          ? p.purchaseDate.slice(0, 10)
          : p.purchaseDate.toISOString().slice(0, 10),
      dueDate: p.dueDate
        ? typeof p.dueDate === "string"
          ? p.dueDate.slice(0, 10)
          : p.dueDate.toISOString().slice(0, 10)
        : null,
      paymentStatus: p.paymentStatus,
    };

    const list = supplierMap.get(supplier) ?? [];
    list.push(row);
    supplierMap.set(supplier, list);
  }

  const result: PayablesBySupplierGroup[] = [];

  for (const [supplier, purchases] of supplierMap) {
    const dayMap = new Map<string, PayablePurchaseRow[]>();
    for (const p of purchases) {
      const day = p.purchaseDate;
      const list = dayMap.get(day) ?? [];
      list.push(p);
      dayMap.set(day, list);
    }

    const byDay: PayablesByDayGroup[] = [...dayMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayPurchases]) => ({
        date,
        totalOwed: dayPurchases.reduce((s, x) => s + x.balance, 0),
        purchases: dayPurchases,
      }));

    result.push({
      supplier,
      totalOwed: purchases.reduce((s, x) => s + x.balance, 0),
      byDay,
    });
  }

  return result.sort((a, b) => b.totalOwed - a.totalOwed);
}
