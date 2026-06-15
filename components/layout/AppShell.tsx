import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import Footer from "./Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { MobileNav } from "./MobileNav";
import type { NavRole } from "@/lib/navigation";
import type { SessionUser } from "@/lib/session-types";

type AppShellProps = {
  children: React.ReactNode;
  userRoles?: NavRole[] | null;
  user?: SessionUser | null;
};

export function AppShell({ children, userRoles = null, user }: AppShellProps) {
  const hideNav =
    userRoles?.length === 1 &&
    (userRoles[0] === "pos" || userRoles[0] === "kitchen" || userRoles[0] === "counter");

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-surface">
        <Header user={user} />
        <div className="flex flex-1 pt-[4.25rem]">
          {!hideNav && (
            <div className="hidden md:block">
              <Sidebar userRoles={userRoles} />
            </div>
          )}
          {!hideNav && <MobileNav userRoles={userRoles} />}
          <main className="safe-area-padding page flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-20 lg:pb-16">
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </ToastProvider>
  );
}
