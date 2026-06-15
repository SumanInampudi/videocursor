import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import { UserMenu } from "@/components/auth/UserMenu";
import type { SessionUser } from "@/lib/session-types";

type CounterShellProps = {
  children: React.ReactNode;
  user?: SessionUser | null;
  showOrdersLink?: boolean;
};

/** Minimal chrome for counter / retail pickup monitors. */
export function CounterShell({ children, user, showOrdersLink = true }: CounterShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-[100dvh] bg-surface text-charcoal">
        <header className="safe-area-top relative flex flex-wrap items-center justify-between gap-3 border-b border-teal-200/60 bg-surface-card px-4 py-3 shadow-header dark:border-teal-800/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-700" aria-hidden />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700/80">
              Servora · Counter
            </p>
            <h1 className="page-title text-xl md:text-2xl">Counter display</h1>
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
