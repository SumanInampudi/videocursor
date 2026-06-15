"use client";

import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
      {compact && <ThemeToggle compact />}
      <span className="text-charcoal-muted">
        {user.name}
        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
        <span className="font-medium text-charcoal">{roleLabel(navRole)}</span>
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-brand-200/80 bg-surface-card px-2 py-1 text-charcoal hover:bg-brand-50 dark:border-brand-700/35 dark:hover:bg-brand-900/30"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
