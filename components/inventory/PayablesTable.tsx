"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { deleteInventoryPurchase, recordPurchasePayment } from "@/app/actions/purchases";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { smartMatches } from "@/lib/smart-search";
import { formatCurrency } from "@/lib/units";
import { PurchasePaymentStatus } from "@prisma/client";

type PurchaseRow = {
  id: string;
  description: string;
  supplier: string | null;
  totalAmount: { toString(): string };
  amountPaid: { toString(): string };
  paymentStatus: PurchasePaymentStatus;
  purchaseDate: Date;
  dueDate: Date | null;
  inventoryItem: { name: string } | null;
};

export function PayablesTable({ purchases }: { purchases: PurchaseRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function balance(p: PurchaseRow) {
    return Math.max(0, Number(p.totalAmount) - Number(p.amountPaid));
  }

  function submitPayment(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await recordPurchasePayment(id, formData);
      if (result.error) {
        alert(typeof result.error === "string" ? result.error : "Payment failed");
        return;
      }
      setPayingId(null);
      router.refresh();
    });
  }

  function handleDelete(id: string, description: string) {
    if (!confirm(`Delete purchase "${description}"?`)) return;
    startTransition(async () => {
      await deleteInventoryPurchase(id);
      router.refresh();
    });
  }

  const filteredPurchases = useMemo(() => {
    if (!query.trim()) return purchases;
    return purchases.filter((p) =>
      smartMatches(
        [p.description, p.supplier, p.inventoryItem?.name, p.paymentStatus, p.purchaseDate.toString()],
        query
      )
    );
  }, [purchases, query]);

  if (purchases.length === 0) {
    return (
      <div className="empty-state text-sm text-gray-500">
        No open supplier balances.{" "}
        <Link href="/inventory/receive" className="link-brand">
          Receive stock on credit
        </Link>
      </div>
    );
  }

  if (filteredPurchases.length === 0) {
    return (
      <div className="space-y-3">
        <SmartSearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search purchase, supplier, item, or status..."
          className="max-w-md"
        />
        <p className="text-xs text-gray-500">0 results</p>
        <div className="empty-state text-sm text-gray-500">
          No matching payables found for this search.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SmartSearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search purchase, supplier, item, or status..."
        className="max-w-md"
      />
      <DataTable
        resultLabel={`${filteredPurchases.length} result${filteredPurchases.length === 1 ? "" : "s"}`}
      >
        <table>
          <thead>
            <tr>
              <th>Purchase</th>
              <th>Due</th>
              <th className="text-right">Total</th>
              <th className="text-right">Owed</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
          {filteredPurchases.map((p) => {
            const owed = balance(p);
            return (
              <tr key={p.id} className="align-top">
                <td>
                  <p className="font-medium">{p.description}</p>
                  {p.inventoryItem && (
                    <p className="text-xs text-gray-400">{p.inventoryItem.name}</p>
                  )}
                  {p.supplier && <p className="text-xs text-gray-400">{p.supplier}</p>}
                  <p className="text-xs text-gray-400">
                    {p.paymentStatus} · {new Date(p.purchaseDate).toLocaleDateString()}
                  </p>
                </td>
                <td className="text-muted">
                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}
                </td>
                <td className="text-right tabular-nums">{formatCurrency(Number(p.totalAmount))}</td>
                <td className="text-right font-medium text-red-700 tabular-nums">
                  {formatCurrency(owed)}
                </td>
                <td className="text-right">
                  {payingId === p.id ? (
                    <form
                      action={(fd) => submitPayment(p.id, fd)}
                      className="flex flex-col items-end gap-2"
                    >
                      <Input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={owed}
                        defaultValue={owed.toFixed(2)}
                        className="w-28 text-right"
                        required
                      />
                      <div className="flex gap-1">
                        <Button type="submit" className="text-xs" disabled={isPending}>
                          Pay
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => setPayingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        className="text-xs"
                        disabled={isPending}
                        onClick={() => setPayingId(p.id)}
                      >
                        Record payment
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs text-red-600 hover:text-red-700"
                        disabled={isPending}
                        onClick={() => handleDelete(p.id, p.description)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
