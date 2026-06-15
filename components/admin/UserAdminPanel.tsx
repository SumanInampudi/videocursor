"use client";

import { useActionState, useTransition } from "react";
import { createUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserRole } from "@prisma/client";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

const ROLE_OPTIONS = [
  { value: UserRole.OWNER, label: "Admin (owner)" },
  { value: UserRole.MANAGER, label: "Manager" },
  { value: UserRole.POS, label: "POS register" },
  { value: UserRole.KITCHEN, label: "Kitchen display" },
  { value: UserRole.COUNTER, label: "Counter display" },
  { value: UserRole.VIEWER, label: "Viewer (reports)" },
];

function roleName(role: UserRole) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

export function UserAdminPanel({ users }: { users: UserRow[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await createUser(formData);
    },
    null
  );
  const [, startRefresh] = useTransition();

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form action={formAction} className="space-y-4 card-padded">
        <h2 className="font-semibold text-servora-charcoal">Add team member</h2>
        <Input label="Name" name="name" required />
        <Input label="Email" name="email" type="email" required />
        <Input label="Password" name="password" type="password" required minLength={6} />
        <Select label="Role" name="role" options={ROLE_OPTIONS} defaultValue={UserRole.POS} />
        {state?.error && <p className="text-sm text-servora-red">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-green-700">User created. Refresh to see the list.</p>
        )}
        <Button type="submit" disabled={pending}>
          Create user
        </Button>
      </form>

      <div>
        <DataTable>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-muted">{roleName(u.role)}</td>
                  <td className="text-muted">{u.email}</td>
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
          Refresh list
        </button>
      </div>
    </div>
  );
}
