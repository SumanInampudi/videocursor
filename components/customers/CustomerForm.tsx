"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

type CustomerFormProps = {
  action: (formData: FormData) => Promise<{
    error?: Record<string, string[]>;
    success?: boolean;
    customerId?: string;
  }>;
  initialData?: {
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    dateOfBirth?: string | null;
  };
  submitLabel?: string;
  redirectToDetail?: boolean;
};

export function CustomerForm({
  action,
  initialData,
  submitLabel = "Save customer",
  redirectToDetail = false,
}: CustomerFormProps) {
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
        toastError("Could not save customer");
        return;
      }
      success("Customer saved");
      if (redirectToDetail && result.customerId) {
        router.push(`/customers/${result.customerId}`);
      } else {
        router.push("/customers");
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <Input name="name" label="Name *" defaultValue={initialData?.name} error={errors.name?.[0]} required />
      <Input name="phone" label="Phone" defaultValue={initialData?.phone ?? ""} />
      <Input name="email" label="Email" type="email" defaultValue={initialData?.email ?? ""} error={errors.email?.[0]} />
      <Input
        name="dateOfBirth"
        label="Date of birth"
        type="date"
        defaultValue={initialData?.dateOfBirth?.slice(0, 10) ?? ""}
      />
      <p className="text-xs text-gray-500">
        Used for birthday-month promotions when a customer is linked to an order.
      </p>
      <Textarea name="notes" label="Notes" rows={3} defaultValue={initialData?.notes ?? ""} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
