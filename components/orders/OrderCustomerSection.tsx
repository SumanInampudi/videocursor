"use client";

import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

type CustomerOption = { id: string; name: string };

export function OrderCustomerSection({ customers }: { customers: CustomerOption[] }) {
  return (
    <div className="space-y-4">
      <Select
        name="customerId"
        label="Linked customer (optional)"
        options={[
          { value: "", label: "— Walk-in / no profile —" },
          ...customers.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <Input
        name="customerName"
        label="Display name on order (optional)"
        placeholder="Walk-in, table 4, etc."
      />
      <p className="text-xs text-gray-500">
        Pick a saved customer for insights, or enter a one-off label.{" "}
        <a href="/customers/new" className="link-brand">
          Add customer →
        </a>
      </p>
    </div>
  );
}
