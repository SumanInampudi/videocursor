"use client";

import { useActionState, useTransition } from "react";
import { createBusiness } from "@/app/actions/business";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export function BusinessAdminPanel({
  businesses,
  currentBusinessId,
}: {
  businesses: BusinessRow[];
  currentBusinessId: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await createBusiness(formData);
    },
    null
  );
  const [, startRefresh] = useTransition();

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form action={formAction} className="space-y-4 card-padded">
        <h2 className="font-semibold text-servora-charcoal">Add business</h2>
        <Input label="Name" name="name" required placeholder="Sunrise Café" />
        <Input label="Slug (URL id)" name="slug" placeholder="sunrise-cafe" />
        <Input label="Timezone" name="timezone" defaultValue="Asia/Kolkata" />
        <Input label="Currency" name="currency" defaultValue="INR" />
        {state?.error && <p className="text-sm text-servora-red">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-green-700">Business created with default tables.</p>
        )}
        <Button type="submit" disabled={pending}>
          Create business
        </Button>
      </form>

      <div>
        <DataTable>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr
                  key={b.id}
                  className={b.id === currentBusinessId ? "bg-brand-50/60" : undefined}
                >
                  <td className="font-medium">
                    {b.name}
                    {b.id === currentBusinessId && (
                      <span className="ml-2 text-xs text-gray-400">(current session)</span>
                    )}
                  </td>
                  <td className="text-muted">{b.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-50"
          onClick={() => startRefresh(() => window.location.reload())}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
