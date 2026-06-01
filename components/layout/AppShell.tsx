import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import Footer from "./Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { MobileNav } from "./MobileNav";
import type { NavRole } from "@/lib/navigation";
import { getServerRoles, roleLabel } from "@/lib/auth";

type AppShellProps = {
  children: React.ReactNode;
  userRoles?: NavRole[] | null;
};

export function AppShell({ children, userRoles }: AppShellProps) {
  const roles = userRoles ?? getServerRoles();

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <div className="flex flex-1 pt-16">
          <div className="hidden md:block">
            <Sidebar userRoles={roles} />
          </div>
          <MobileNav userRoles={roles} />
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-16">{children}</main>
        </div>
        <Footer />
        {roles && roles.length > 0 && (
          <p className="fixed bottom-8 right-2 z-40 hidden text-[10px] text-gray-400 md:block">
            Role: {roleLabel(roles[0]!)}
          </p>
        )}
      </div>
    </ToastProvider>
  );
}
