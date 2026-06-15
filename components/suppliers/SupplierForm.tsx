"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

type SupplierFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  initialData?: {
    name: string;
    contactPhone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
  };
  submitLabel?: string;
};

export function SupplierForm({
  action,
  initialData,
  submitLabel = "Save supplier",
}: SupplierFormProps) {
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
        toastError("Could not save supplier");
        return;
      }
      success("Supplier saved");
      router.push("/suppliers");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <Input name="name" label="Name *" defaultValue={initialData?.name} error={errors.name?.[0]} required />
      <Input
        name="contactPhone"
        label="Phone"
        defaultValue={initialData?.contactPhone ?? ""}
        error={errors.contactPhone?.[0]}
      />
      <Input name="email" label="Email" type="email" defaultValue={initialData?.email ?? ""} error={errors.email?.[0]} />
      <Textarea name="address" label="Address" rows={2} defaultValue={initialData?.address ?? ""} />
      <Textarea name="notes" label="Notes" rows={2} defaultValue={initialData?.notes ?? ""} />
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
