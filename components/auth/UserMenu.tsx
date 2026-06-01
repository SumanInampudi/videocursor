"use client";

import { logout } from "@/app/actions/auth";
import { roleLabel } from "@/lib/role-label";
import type { SessionUser } from "@/lib/session-types";
import { userRoleToNav } from "@/lib/permissions";

type UserMenuProps = {
  user: SessionUser;
  compact?: boolean;
};

export function UserMenu({ user, compact }: UserMenuProps) {
  const navRole = userRoleToNav(user.role);

  return (
    <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="text-gray-600">
        {user.name}
        <span className="mx-1 text-gray-300">·</span>
        <span className="font-medium text-servora-charcoal">{roleLabel(navRole)}</span>
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
