"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getInventoryItemForIngredientBarcode } from "@/app/actions/ingredients";
import { BarcodeScanInput } from "@/components/ui/BarcodeScanInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { toDateInputValue } from "@/lib/dates";

type ItemOption = {
  id: string;
  name: string;
  sku: string;
  supplier: string | null;
  supplierId: string | null;
};

type SupplierOption = { id: string; name: string };

const PAYMENT_OPTIONS = [
  { value: "PAID", label: "Paid in full" },
  { value: "CREDIT", label: "On credit (owe supplier)" },
  { value: "PARTIAL", label: "Partially paid" },
];

export function PurchaseForm({
  action,
  items,
  suppliers = [],
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  items: ItemOption[];
  suppliers?: SupplierOption[];
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [scanHint, setScanHint] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const item = items.find((i) => i.id === selectedItem);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.get("inventoryItemId")) {
      formData.delete("inventoryItemId");
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(
          typeof result.error === "object"
            ? (result.error as Record<string, string[]>)
            : { description: [String(result.error)] }
        );
        return;
      }
      router.push("/inventory/payables");
      router.refresh();
    });
  }

  async function handleIngredientScan(barcode: string) {
    const item = await getInventoryItemForIngredientBarcode(barcode);
    if (!item) {
      setScanHint("No stock SKU linked to this ingredient — create stock from Ingredients first.");
      return;
    }
    setSelectedItem(item.id);
    setScanHint(`Selected: ${item.name}`);
    success(`Linked ${item.name}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">Scan ingredient barcode</p>
        <BarcodeScanInput
          onScan={handleIngredientScan}
          placeholder="Scan to select inventory item…"
        />
      </div>
      {scanHint && <p className="text-xs text-gray-500">{scanHint}</p>}
      <Select
        name="inventoryItemId"
        label="Link to inventory item (optional)"
        value={selectedItem}
        onChange={(e) => {
          const id = e.target.value;
          setSelectedItem(id);
          const linked = items.find((i) => i.id === id);
          if (linked?.supplierId) setSelectedSupplierId(linked.supplierId);
        }}
        options={[
          { value: "", label: "General purchase…" },
          ...items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` })),
        ]}
      />
      <Input
        name="description"
        label="Description *"
        defaultValue={item ? `Restock: ${item.name}` : ""}
        placeholder="e.g. 50kg flour delivery"
        error={errors.description?.[0]}
        required
      />
      {suppliers.length > 0 ? (
        <Select
          name="supplierId"
          label="Supplier"
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          options={[
            { value: "", label: "— Select supplier —" },
            ...suppliers.map((s) => ({ value: s.id, label: s.name })),
          ]}
          error={errors.supplierId?.[0]}
        />
      ) : (
        <p className="text-xs text-gray-500">
          <a href="/suppliers/new" className="text-servora-yellow hover:underline">
            Add suppliers
          </a>{" "}
          to link purchases for payables.
        </p>
      )}
      <Input
        name="supplier"
        label="Supplier name (optional, free text)"
        defaultValue={item?.supplier ?? ""}
        error={errors.supplier?.[0]}
        placeholder="Used if not selecting from list"
      />
      <Input
        name="totalAmount"
        label="Total amount *"
        type="number"
        step="0.01"
        min="0.01"
        error={errors.totalAmount?.[0]}
        required
      />
      <Select
        name="paymentStatus"
        label="Payment *"
        value={paymentStatus}
        onChange={(e) => setPaymentStatus(e.target.value)}
        options={PAYMENT_OPTIONS}
        error={errors.paymentStatus?.[0]}
        required
      />
      {paymentStatus === "PARTIAL" && (
        <Input
          name="amountPaid"
          label="Amount paid so far *"
          type="number"
          step="0.01"
          min="0.01"
          error={errors.amountPaid?.[0]}
          required
        />
      )}
      <Input
        name="purchaseDate"
        label="Purchase date *"
        type="date"
        defaultValue={toDateInputValue(new Date())}
        error={errors.purchaseDate?.[0]}
        required
      />
      {(paymentStatus === "CREDIT" || paymentStatus === "PARTIAL") && (
        <Input
          name="dueDate"
          label="Due date (optional)"
          type="date"
          error={errors.dueDate?.[0]}
        />
      )}
      <Textarea name="notes" label="Notes" rows={2} error={errors.notes?.[0]} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Record purchase"}
      </Button>
    </form>
  );
}
