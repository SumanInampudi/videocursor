"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { duplicateExpensesFromPreviousMonth } from "@/app/actions/expenses";
import { Button } from "@/components/ui/Button";
import { confirmAction, useToast } from "@/components/ui/Toast";

export function DuplicateMonthButton({ periodMonth }: { periodMonth: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success, error } = useToast();

  function handleClick() {
    if (
      !confirmAction(
        `Copy all expenses from the previous month into ${periodMonth}? Skips duplicates.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await duplicateExpensesFromPreviousMonth(periodMonth);
      if (result.error) {
        error(result.error);
        return;
      }
      success(`Copied ${result.created} expense(s) from ${result.fromMonth}`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="text-sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "Copying…" : "Copy from previous month"}
    </Button>
  );
}
