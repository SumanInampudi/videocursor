import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import { UserMenu } from "@/components/auth/UserMenu";
import type { SessionUser } from "@/lib/session-types";

type PosShellProps = {
  children: React.ReactNode;
  user?: SessionUser | null;
};

/** Full-viewport shell for register / POS — no sidebar or footer. */
export function PosShell({ children, user }: PosShellProps) {
  return (
    <ToastProvider>
      <div className="safe-area-padding flex h-[100dvh] flex-col overflow-hidden bg-surface text-charcoal">
        <div className="shrink-0 border-b border-brand-200/60 bg-white shadow-header">
          <div className="h-1 w-full bg-brand-gradient" aria-hidden />
          <div className="flex items-center justify-end gap-2 px-3 py-1.5">
            {user && <UserMenu user={user} compact />}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </ToastProvider>
  );
}

export function PosExitLink() {
  return (
    <Link
      href="/orders"
      className="touch-target inline-flex items-center rounded-lg border-2 border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-900 shadow-sm hover:bg-brand-50"
    >
      ← Exit POS
    </Link>
  );
}
