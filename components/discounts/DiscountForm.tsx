"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";

type DiscountFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  initialData?: {
    code: string;
    name: string;
    type: "PERCENT" | "FIXED";
    value: number;
    minOrderAmount: number | null;
    isActive: boolean;
    validFrom: string | null;
    validTo: string | null;
  };
  submitLabel?: string;
};

export function DiscountForm({
  action,
  initialData,
  submitLabel = "Save discount",
}: DiscountFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(result.error);
        toastError("Could not save discount");
        return;
      }
      success("Discount saved");
      router.push("/discounts");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <Input
        name="code"
        label="Code *"
        defaultValue={initialData?.code}
        error={errors.code?.[0]}
        placeholder="SUMMER20"
        required
      />
      <Input name="name" label="Display name *" defaultValue={initialData?.name} error={errors.name?.[0]} required />
      <Select
        name="type"
        label="Type"
        defaultValue={initialData?.type ?? "PERCENT"}
        options={[
          { value: "PERCENT", label: "Percent off" },
          { value: "FIXED", label: "Fixed amount (₹)" },
        ]}
      />
      <Input
        name="value"
        label="Value *"
        type="number"
        step="0.01"
        min="0"
        defaultValue={initialData?.value}
        error={errors.value?.[0]}
        required
      />
      <Input
        name="minOrderAmount"
        label="Minimum order (₹)"
        type="number"
        step="0.01"
        min="0"
        defaultValue={initialData?.minOrderAmount ?? ""}
      />
      <Input
        name="validFrom"
        label="Valid from"
        type="date"
        defaultValue={initialData?.validFrom?.slice(0, 10) ?? ""}
      />
      <Input
        name="validTo"
        label="Valid to"
        type="date"
        defaultValue={initialData?.validTo?.slice(0, 10) ?? ""}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={initialData?.isActive ?? true} />
        Active
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
