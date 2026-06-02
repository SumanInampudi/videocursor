"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import { currentPeriodMonth, toDateInputValue } from "@/lib/dates";

type ExpenseFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  defaultPeriodMonth?: string;
  initialData?: {
    category: string;
    description: string;
    amount: number;
    periodMonth: string;
    expenseDate: Date | string | null;
    notes: string | null;
  };
  submitLabel?: string;
};

export function ExpenseForm({
  action,
  defaultPeriodMonth,
  initialData,
  submitLabel = "Save expense",
}: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
  }));
  const initialExpenseDate = initialData?.expenseDate
    ? new Date(initialData.expenseDate)
    : null;
  const initialExpenseDateValue =
    initialExpenseDate && !Number.isNaN(initialExpenseDate.getTime())
      ? toDateInputValue(initialExpenseDate)
      : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(result.error);
        return;
      }
      router.push("/expenses");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label
          htmlFor="periodMonth"
          className="mb-1 block text-sm font-medium text-servora-charcoal"
        >
          Accounting month *
        </label>
        <input
          id="periodMonth"
          name="periodMonth"
          type="month"
          required
          defaultValue={
            initialData?.periodMonth ?? defaultPeriodMonth ?? currentPeriodMonth()
          }
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow ${errors.periodMonth ? "border-servora-red" : ""}`}
        />
        <p className="mt-1 text-xs text-gray-500">
          Which month this cost belongs to for profit &amp; loss (e.g. May rent → May).
        </p>
        {errors.periodMonth && (
          <span className="text-xs text-servora-red">{errors.periodMonth[0]}</span>
        )}
      </div>

      <Select
        name="category"
        label="Category *"
        defaultValue={initialData?.category ?? "OTHER"}
        options={categoryOptions}
        error={errors.category?.[0]}
        required
      />
      <Input
        name="description"
        label="Description *"
        defaultValue={initialData?.description ?? ""}
        placeholder="e.g. May rent, weekly payroll"
        error={errors.description?.[0]}
        required
      />
      <Input
        name="amount"
        label="Amount *"
        type="number"
        step="0.01"
        min="0.01"
        defaultValue={initialData ? String(initialData.amount) : ""}
        error={errors.amount?.[0]}
        required
      />
      <Input
        name="expenseDate"
        label="Payment date (optional)"
        type="date"
        defaultValue={initialExpenseDateValue}
        error={errors.expenseDate?.[0]}
      />
      <Textarea
        name="notes"
        label="Notes"
        rows={2}
        defaultValue={initialData?.notes ?? ""}
        error={errors.notes?.[0]}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
