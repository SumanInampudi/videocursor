"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { toDateInputValue } from "@/lib/dates";

type ItemOption = {
  id: string;
  name: string;
  sku: string;
  supplier: string | null;
};

const PAYMENT_OPTIONS = [
  { value: "PAID", label: "Paid in full" },
  { value: "CREDIT", label: "On credit (owe supplier)" },
  { value: "PARTIAL", label: "Partially paid" },
];

export function PurchaseForm({
  action,
  items,
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  items: ItemOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [selectedItem, setSelectedItem] = useState("");

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

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <Select
        name="inventoryItemId"
        label="Link to inventory item (optional)"
        value={selectedItem}
        onChange={(e) => setSelectedItem(e.target.value)}
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
      <Input
        name="supplier"
        label="Supplier"
        defaultValue={item?.supplier ?? ""}
        error={errors.supplier?.[0]}
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
