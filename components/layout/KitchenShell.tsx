import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import { UserMenu } from "@/components/auth/UserMenu";
import type { SessionUser } from "@/lib/session-types";

type KitchenShellProps = {
  children: React.ReactNode;
  user?: SessionUser | null;
  showOrdersLink?: boolean;
};

/** Minimal chrome for wall-mounted kitchen / pass monitors. */
export function KitchenShell({ children, user, showOrdersLink = true }: KitchenShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-[100dvh] bg-surface text-charcoal">
        <header className="safe-area-top relative flex flex-wrap items-center justify-between gap-3 border-b border-brand-200/60 bg-surface-card px-4 py-3 shadow-header dark:border-brand-700/30">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" aria-hidden />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700/80">
              Servora · Kitchen
            </p>
            <h1 className="page-title text-xl md:text-2xl">Kitchen display</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {user && <UserMenu user={user} compact />}
            {showOrdersLink && (
              <Link
                href="/orders"
                className="rounded-md border border-brand-200/80 bg-surface-card px-3 py-2 text-charcoal hover:bg-brand-50 dark:border-brand-700/35 dark:hover:bg-brand-900/30"
              >
                Orders
              </Link>
            )}
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
