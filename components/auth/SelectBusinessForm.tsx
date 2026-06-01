"use client";

import { useActionState } from "react";
import { selectBusinessAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { roleLabel } from "@/lib/role-label";
import { userRoleToNav } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type Choice = {
  businessId: string;
  name: string;
  slug: string;
  role: UserRole;
};

export function SelectBusinessForm({
  choices,
  nextPath,
}: {
  choices: Choice[];
  nextPath?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await selectBusinessAction(null, formData)) ?? null;
    },
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-3">
      {nextPath && <input type="hidden" name="next" value={nextPath} />}
      {choices.map((c) => (
        <label
          key={c.businessId}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-servora-yellow has-[:checked]:border-servora-yellow has-[:checked]:bg-yellow-50"
        >
          <input
            type="radio"
            name="businessId"
            value={c.businessId}
            required
            className="h-4 w-4 text-servora-yellow"
          />
          <div>
            <p className="font-semibold text-servora-charcoal">{c.name}</p>
            <p className="text-xs text-gray-500">
              {c.slug} · {roleLabel(userRoleToNav(c.role))}
            </p>
          </div>
        </label>
      ))}
      {state?.error && <p className="text-sm text-servora-red">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Continuing…" : "Continue"}
      </Button>
    </form>
  );
}
