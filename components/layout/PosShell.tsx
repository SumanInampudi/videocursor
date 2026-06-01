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
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-100 text-servora-charcoal safe-area-padding">
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-gray-200 bg-white px-3 py-1.5">
          {user && <UserMenu user={user} compact />}
        </div>
        {children}
      </div>
    </ToastProvider>
  );
}

export function PosExitLink() {
  return (
    <Link
      href="/orders"
      className="touch-target inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      ← Exit POS
    </Link>
  );
}
