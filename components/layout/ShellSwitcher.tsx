"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { KitchenShell } from "@/components/layout/KitchenShell";
import { PosShell } from "@/components/layout/PosShell";
import type { NavRole } from "@/lib/navigation";
import type { SessionUser } from "@/lib/session-types";

type ShellSwitcherProps = {
  children: React.ReactNode;
  userRoles?: NavRole[] | null;
  user?: SessionUser | null;
};

export function ShellSwitcher({ children, userRoles, user }: ShellSwitcherProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isPublicQueue = pathname === "/queue" || pathname?.startsWith("/queue/");

  if (isPublicQueue) {
    return <>{children}</>;
  }
  const isPos =
    pathname === "/orders/pos" ||
    pathname?.startsWith("/orders/pos/") ||
    pathname === "/inventory/receive";
  const isKitchen = pathname === "/orders/kitchen";

  if (isLogin) {
    return <>{children}</>;
  }

  if (isPos) {
    return <PosShell user={user}>{children}</PosShell>;
  }

  if (isKitchen) {
    const showOrdersLink =
      !user || user.role === "OWNER" || user.role === "MANAGER";
    return (
      <KitchenShell user={user} showOrdersLink={showOrdersLink}>
        {children}
      </KitchenShell>
    );
  }

  return (
    <AppShell userRoles={userRoles} user={user}>
      {children}
    </AppShell>
  );
}
