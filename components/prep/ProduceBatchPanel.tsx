"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { producePrepBatch } from "@/app/actions/prep";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatQuantity } from "@/lib/units";

type PrepForProduce = {
  id: string;
  name: string;
  yieldQuantity: number | string;
  yieldUnit: string;
  prepOutputInventoryItem?: {
    quantity: number | string;
    unit: string;
    costPerUnit: number | string;
  } | null;
};

type PrepBatchRow = {
  id: string;
  quantityProduced: number | string;
  totalInputCost: number | string;
  costPerUnit: number | string;
  producedAt: string | Date;
  prepProduct: { name: string; yieldUnit: string };
};

type ProduceBatchPanelProps = {
  prepItems: PrepForProduce[];
  recentBatches: PrepBatchRow[];
};

export function ProduceBatchPanel({ prepItems, recentBatches }: ProduceBatchPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();
  const [prepId, setPrepId] = useState(prepItems[0]?.id ?? "");
  const [outputQty, setOutputQty] = useState("");
  const [note, setNote] = useState("");

  const selected = useMemo(
    () => prepItems.find((p) => p.id === prepId),
    [prepItems, prepId]
  );

  function handleProduce() {
    const qty = Number(outputQty);
    if (!prepId || !qty || qty <= 0) {
      toastError("Select a prep item and enter output quantity.");
      return;
    }

    startTransition(async () => {
      const result = await producePrepBatch({
        prepProductId: prepId,
        outputQuantity: qty,
        note: note.trim() || undefined,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      success(
        `Produced ${qty} ${selected?.yieldUnit ?? ""} · cost ${formatCurrency(result.costPerUnit ?? 0)}/${selected?.yieldUnit ?? "unit"}`
      );
      setOutputQty("");
      setNote("");
      router.refresh();
    });
  }

  if (prepItems.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-text">Create a prep item first, then run a batch here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card-padded space-y-4">
        <h2 className="section-title">Produce batch</h2>
        <p className="form-hint">
          Deducts input raw materials (FIFO) and adds output to prep stock at rolled-up cost.
        </p>

        <Select
          label="Prep item"
          value={prepId}
          onChange={(e) => {
            setPrepId(e.target.value);
            const p = prepItems.find((i) => i.id === e.target.value);
            if (p) setOutputQty(String(Number(p.yieldQuantity)));
          }}
          options={prepItems.map((p) => ({
            value: p.id,
            label: `${p.name} (recipe: ${Number(p.yieldQuantity)} ${p.yieldUnit})`,
          }))}
        />

        {selected?.prepOutputInventoryItem && (
          <p className="text-sm text-gray-600">
            On hand:{" "}
            {formatQuantity(
              Number(selected.prepOutputInventoryItem.quantity),
              selected.prepOutputInventoryItem.unit
            )}
          </p>
        )}

        <Input
          label={`Output quantity (${selected?.yieldUnit ?? "units"}) *`}
          type="number"
          step="0.01"
          min="0.01"
          value={outputQty}
          onChange={(e) => setOutputQty(e.target.value)}
          hint={`Standard recipe makes ${selected ? Number(selected.yieldQuantity) : "—"} ${selected?.yieldUnit ?? ""}`}
        />

        <Textarea
          label="Note (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Button type="button" disabled={isPending} onClick={handleProduce}>
          {isPending ? "Producing…" : "Produce batch"}
        </Button>
      </section>

      <section className="card-padded">
        <h2 className="section-title mb-3">Recent batches</h2>
        {recentBatches.length === 0 ? (
          <p className="text-sm text-gray-500">No batches yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {recentBatches.map((batch) => (
              <li key={batch.id} className="py-2">
                <p className="font-medium">{batch.prepProduct.name}</p>
                <p className="text-gray-600">
                  {formatQuantity(Number(batch.quantityProduced), batch.prepProduct.yieldUnit)} ·{" "}
                  {formatCurrency(Number(batch.totalInputCost))} total
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(batch.producedAt).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
