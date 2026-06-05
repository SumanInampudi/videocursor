"use client";

import { useState, useTransition } from "react";
import { savePosCategoryOrder } from "@/app/actions/pos-settings";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type PosCategoryOrderEditorProps = {
  initialOrder: string[];
  allCategories: string[];
};

export function PosCategoryOrderEditor({
  initialOrder,
  allCategories,
}: PosCategoryOrderEditorProps) {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = useState<string[]>(() => {
    const base =
      initialOrder.length > 0
        ? [...initialOrder]
        : [...allCategories].sort((a, b) => a.localeCompare(b));
    const missing = allCategories.filter((c) => !base.includes(c));
    return [...base, ...missing.sort((a, b) => a.localeCompare(b))];
  });

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    setOrder((list) => {
      const copy = [...list];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      return copy;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePosCategoryOrder(order);
      if (result.success) success("Category order saved");
      else toastError("Could not save");
    });
  }

  function resetAlpha() {
    setOrder([...allCategories].sort((a, b) => a.localeCompare(b)));
  }

  if (allCategories.length === 0) {
    return <p className="text-sm text-gray-500">Add products with categories first.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Categories appear left-to-right on the POS register in this order. Unlisted categories
        still show at the end.
      </p>
      <ul className="space-y-2">
        {order.map((category, index) => (
          <li
            key={category}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <span className="font-medium text-servora-charcoal">{category}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={index === 0 || isPending}
                onClick={() => move(index, -1)}
                className="touch-target rounded border border-gray-200 px-3 text-sm disabled:opacity-40"
                aria-label={`Move ${category} up`}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === order.length - 1 || isPending}
                onClick={() => move(index, 1)}
                className="touch-target rounded border border-gray-200 px-3 text-sm disabled:opacity-40"
                aria-label={`Move ${category} down`}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save order"}
        </Button>
        <Button type="button" variant="secondary" onClick={resetAlpha} disabled={isPending}>
          Reset A–Z
        </Button>
      </div>
    </div>
  );
}
