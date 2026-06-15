"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { toDateInputValue } from "@/lib/dates";
import { UNITS } from "@/lib/units";

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
  categories = [],
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  items: ItemOption[];
  suppliers?: SupplierOption[];
  categories?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [createNewItem, setCreateNewItem] = useState(false);

  const item = items.find((i) => i.id === selectedItem);
  const unitOptions = UNITS.map((u) => ({ value: u, label: u }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (createNewItem) {
      formData.set("createNewItem", "true");
    }
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

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
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
      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={createNewItem}
          onChange={(e) => setCreateNewItem(e.target.checked)}
          className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
        />
        Create new SKU inline (first-time purchase)
      </label>
      {createNewItem && !selectedItem && (
        <div className="grid gap-3 rounded-lg border border-brand-200/60 bg-brand-50/30 p-3 sm:grid-cols-2">
          <Input
            name="newItemName"
            label="New item name *"
            placeholder="e.g. Sprite 300ml Can"
            error={errors.newItemName?.[0]}
          />
          <Input
            name="newItemSku"
            label="New SKU *"
            placeholder="e.g. SPRITE-300"
            error={errors.newItemSku?.[0]}
          />
          <CategoryCombobox
            name="newItemCategory"
            label="Category"
            categories={categories}
            placeholder="e.g. Beverages"
            error={errors.newItemCategory?.[0]}
            required
          />
          <Select
            name="newItemUnit"
            label="Unit *"
            defaultValue="Pcs"
            options={unitOptions}
            error={errors.newItemUnit?.[0]}
          />
          <p className="sm:col-span-2 text-xs text-charcoal-muted">
            The SKU will be created with opening qty 0, then this purchase will be recorded against it.
          </p>
        </div>
      )}
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
          <a href="/suppliers/new" className="link-brand">
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
