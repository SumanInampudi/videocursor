"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteInventoryPurchase, recordPurchasePayment } from "@/app/actions/purchases";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

  if (purchases.length === 0) {
    return (
      <div className="empty-state text-sm text-gray-500">
        No open supplier balances.{" "}
        <Link href="/inventory/purchases/new" className="link-brand">
          Record a credit purchase
        </Link>
      </div>
    );
  }

  return (
    <div className="table-panel">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Purchase
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Due
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Total
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Owed
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {purchases.map((p) => {
            const owed = balance(p);
            return (
              <tr key={p.id} className="align-top hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-servora-charcoal">{p.description}</p>
                  {p.inventoryItem && (
                    <p className="text-xs text-gray-500">{p.inventoryItem.name}</p>
                  )}
                  {p.supplier && <p className="text-xs text-gray-500">{p.supplier}</p>}
                  <p className="text-xs text-gray-400">
                    {p.paymentStatus} · {new Date(p.purchaseDate).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(Number(p.totalAmount))}</td>
                <td className="px-4 py-3 text-right font-semibold text-servora-red">
                  {formatCurrency(owed)}
                </td>
                <td className="px-4 py-3 text-right">
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
                        variant="danger"
                        className="text-xs"
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
    </div>
  );
}
