"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createInventoryFromIngredient } from "@/app/actions/ingredients";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function CreateStockButton({
  ingredientId,
  hasStock,
}: {
  ingredientId: string;
  hasStock: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success, error } = useToast();

  if (hasStock) return null;

  function handleClick() {
    startTransition(async () => {
      const result = await createInventoryFromIngredient(ingredientId);
      if (result.error) {
        if (result.itemId) {
          router.push(`/inventory/${result.itemId}/edit`);
          return;
        }
        error(result.error);
        return;
      }
      success("Stock SKU created");
      router.push(`/inventory/${result.itemId}/edit`);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="text-xs"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "…" : "Create stock"}
    </Button>
  );
}
