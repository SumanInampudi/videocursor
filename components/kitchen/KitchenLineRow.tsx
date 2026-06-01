"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleKitchenLineDone } from "@/app/actions/kitchen";
import { useToast } from "@/components/ui/Toast";
import { isKitchenLineDone, isKitchenLineNew, type KitchenLineView } from "@/lib/kitchen-kds";
type KitchenLineRowProps = {
  line: KitchenLineView & { recipe?: { name: string } | null };
  order: { kitchenAcknowledgedAt?: Date | string | null };
  disabled?: boolean;
};

export function KitchenLineRow({ line, order, disabled }: KitchenLineRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { error: toastError } = useToast();

  const done = isKitchenLineDone(line);
  const isNew = isKitchenLineNew(line, order);
  const label = line.recipe?.name ?? line.recipeName;

  function toggle() {
    if (disabled || pending) return;
    startTransition(async () => {
      const result = await toggleKitchenLineDone(line.id);
      if (result.error) toastError(result.error);
      router.refresh();
    });
  }

  return (
    <li
      className={`flex items-start gap-1.5 rounded px-1 py-0.5 transition-colors ${
        isNew && !done
          ? "bg-amber-50 ring-1 ring-amber-200/80"
          : done
            ? "bg-gray-50/80"
            : "hover:bg-gray-50"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || pending}
        aria-pressed={done}
        aria-label={done ? `Mark ${label} not done` : `Mark ${label} done`}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          done
            ? "border-green-600 bg-green-600 text-white"
            : isNew
              ? "border-amber-500 bg-white hover:bg-amber-50"
              : "border-gray-300 bg-white hover:border-servora-yellow"
        } disabled:opacity-50`}
      >
        {done ? (
          <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs leading-snug ${
            done ? "text-gray-400 line-through decoration-gray-300" : "text-gray-800"
          }`}
        >
          <span className="font-bold tabular-nums text-servora-charcoal">{line.quantity}×</span>{" "}
          <span className="font-medium">{label}</span>
        </p>
        {isNew && !done && (
          <span className="mt-0.5 inline-block rounded bg-amber-500 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white">
            New
          </span>
        )}
      </div>
    </li>
  );
}
