import { toDateInputValue } from "@/lib/dates";
import type { PurchasePaymentStatus, Unit } from "@prisma/client";

export type StockReceiveLineSummary = {
  name: string;
  quantity: number;
  unit: Unit;
  unitCost: number;
  lineTotal: number;
};

export type StockReceiveReceipt = {
  receiveBatchId: string;
  purchaseDate: string;
  supplierName: string | null;
  invoiceRef: string | null;
  notes: string | null;
  paymentStatus: PurchasePaymentStatus;
  lines: StockReceiveLineSummary[];
  grandTotal: number;
  amountPaid: number;
  creditOwed: number;
  expenseRecorded: boolean;
  postedAt: string;
};

export type StockHistoryKind = "receive" | "manual";

export type StockReceiveBatchSummary = {
  receiveBatchId: string;
  kind: StockHistoryKind;
  purchaseDate: string;
  postedAt: string;
  supplierName: string | null;
  invoiceRef: string | null;
  paymentStatus: PurchasePaymentStatus;
  lineCount: number;
  grandTotal: number;
  amountPaid: number;
  creditOwed: number;
  lines: StockReceiveLineSummary[];
};

export const STOCK_HISTORY_RECEIVE_PREFIX = "Receive:";
export const STOCK_HISTORY_MANUAL_PREFIX = "Manual:";

type PurchaseRow = {
  id: string;
  receiveBatchId: string | null;
  description: string;
  supplier: string | null;
  totalAmount: { toString(): string };
  amountPaid: { toString(): string };
  paymentStatus: PurchasePaymentStatus;
  purchaseDate: Date;
  notes: string | null;
  createdAt: Date;
  inventoryItem: { name: string } | null;
};

const RECEIVE_LINE_RE = /^Receive:\s*(.+?)\s*\(([\d.]+)\s*(\w+)\)$/;
const MANUAL_LINE_RE = /^Manual:\s*(.+?)\s*\((.+)\)$/;

function parseReceiveDescription(
  description: string,
  itemName: string | null,
  lineTotal: number
): Pick<StockReceiveLineSummary, "name" | "quantity" | "unit" | "unitCost" | "lineTotal"> {
  const manual = MANUAL_LINE_RE.exec(description);
  if (manual) {
    return {
      name: `${manual[1]} — ${manual[2]}`,
      quantity: 1,
      unit: "g",
      unitCost: 0,
      lineTotal,
    };
  }

  const match = RECEIVE_LINE_RE.exec(description);
  if (match) {
    const quantity = parseFloat(match[2]);
    const unit = match[3] as Unit;
    return {
      name: match[1],
      quantity,
      unit,
      unitCost: quantity > 0 ? lineTotal / quantity : 0,
      lineTotal,
    };
  }
  return {
    name: itemName ?? description,
    quantity: 1,
    unit: "g",
    unitCost: lineTotal,
    lineTotal,
  };
}

function parseInvoiceRef(notes: string | null): string | null {
  if (!notes) return null;
  const m = /^Ref:\s*([^·]+)/.exec(notes.trim());
  return m ? m[1].trim() : null;
}

function legacyBatchKey(p: PurchaseRow): string {
  const day = toDateInputValue(p.purchaseDate);
  const minute = Math.floor(p.createdAt.getTime() / 60_000);
  return `legacy:${day}:${p.supplier ?? ""}:${p.notes ?? ""}:${p.paymentStatus}:${minute}`;
}

export function groupPurchasesIntoBatches(purchases: PurchaseRow[]): StockReceiveBatchSummary[] {
  const batches = new Map<
    string,
    {
      receiveBatchId: string;
      purchaseDate: Date;
      postedAt: Date;
      supplierName: string | null;
      notes: string | null;
      paymentStatus: PurchasePaymentStatus;
      lines: StockReceiveLineSummary[];
      amountPaid: number;
      kind: StockHistoryKind;
    }
  >();

  for (const p of purchases) {
    const batchId = p.receiveBatchId ?? legacyBatchKey(p);
    const lineKind: StockHistoryKind = p.description.startsWith(STOCK_HISTORY_MANUAL_PREFIX)
      ? "manual"
      : "receive";
    let batch = batches.get(batchId);
    if (!batch) {
      batch = {
        receiveBatchId: p.receiveBatchId ?? batchId,
        purchaseDate: p.purchaseDate,
        postedAt: p.createdAt,
        supplierName: p.supplier,
        notes: p.notes,
        paymentStatus: p.paymentStatus,
        lines: [],
        amountPaid: 0,
        kind: lineKind,
      };
      batches.set(batchId, batch);
    }
    const lineTotal = Number(p.totalAmount);
    batch.lines.push(
      parseReceiveDescription(
        p.description,
        p.inventoryItem?.name ?? null,
        lineTotal
      )
    );
    batch.amountPaid += Number(p.amountPaid);
    if (p.createdAt < batch.postedAt) batch.postedAt = p.createdAt;
  }

  return Array.from(batches.values())
    .map((b) => {
      const grandTotal = b.lines.reduce((s, l) => s + l.lineTotal, 0);
      return {
        receiveBatchId: b.receiveBatchId,
        kind: b.kind,
        purchaseDate: toDateInputValue(b.purchaseDate),
        postedAt: b.postedAt.toISOString(),
        supplierName: b.supplierName,
        invoiceRef: parseInvoiceRef(b.notes),
        paymentStatus: b.paymentStatus,
        lineCount: b.lines.length,
        grandTotal,
        amountPaid: b.amountPaid,
        creditOwed: Math.max(0, grandTotal - b.amountPaid),
        lines: b.lines,
      };
    })
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export const PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  PAID: "Paid in full",
  CREDIT: "On credit",
  PARTIAL: "Partially paid",
};
