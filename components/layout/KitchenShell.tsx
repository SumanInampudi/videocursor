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
      <div className="min-h-[100dvh] bg-gray-50 text-servora-charcoal">
        <header className="safe-area-top flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Servora · Kitchen
            </p>
            <h1 className="text-xl font-bold text-servora-charcoal md:text-2xl">
              Kitchen display
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {user && <UserMenu user={user} compact />}
            {showOrdersLink && (
              <Link
                href="/orders"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-servora-charcoal hover:bg-gray-50"
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
