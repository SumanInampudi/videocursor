import type { UserRole } from "@prisma/client";
import type { NavRole } from "@/lib/navigation";

export function userRoleToNav(role: UserRole): NavRole {
  switch (role) {
    case "OWNER":
      return "owner";
    case "MANAGER":
      return "manager";
    case "POS":
      return "pos";
    case "KITCHEN":
      return "kitchen";
    case "VIEWER":
      return "viewer";
    default:
      return "viewer";
  }
}

export function navToUserRole(role: NavRole): UserRole {
  switch (role) {
    case "owner":
      return "OWNER";
    case "manager":
      return "MANAGER";
    case "pos":
      return "POS";
    case "kitchen":
      return "KITCHEN";
    default:
      return "VIEWER";
  }
}

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "POS":
      return "/orders/pos";
    case "KITCHEN":
      return "/orders/kitchen";
    case "VIEWER":
      return "/reports";
    default:
      return "/";
  }
}

/** Path prefixes allowed per nav role (null = dev mode, all allowed). */
const POS_PREFIXES = ["/orders/pos", "/login", "/api/data"];
const KITCHEN_PREFIXES = ["/orders/kitchen", "/login", "/api/data"];

export function canAccessPath(pathname: string, roles: NavRole[] | null): boolean {
  if (roles === null) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads")) return true;
  if (pathname === "/login") return true;

  const role = roles[0];
  if (!role) return false;

  if (role === "owner" || role === "manager") return true;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/data")) {
    return false;
  }

  if (role === "pos") {
    if (pathname.startsWith("/orders/pos/settings")) return false;
    return POS_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
  }

  if (role === "kitchen") {
    return KITCHEN_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
  }

  if (role === "viewer") {
    const allowed = ["/reports", "/login", "/api/data"];
    return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }

  return false;
}

export function isAdminRole(role: UserRole): boolean {
  return role === "OWNER" || role === "MANAGER";
}
