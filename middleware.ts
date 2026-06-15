import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath, userRoleToNav } from "@/lib/permissions";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session-token";
import type { NavRole } from "@/lib/navigation";

const PUBLIC_PATHS = ["/login", "/select-business", "/queue"];

async function resolveRoles(request: NextRequest): Promise<NavRole[] | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const user = await verifySessionToken(token);
    if (user) return [userRoleToNav(user.role)];
  }

  const envRole = process.env.APP_ROLE?.trim().toLowerCase();
  if (
    envRole === "owner" ||
    envRole === "manager" ||
    envRole === "pos" ||
    envRole === "kitchen" ||
    envRole === "counter" ||
    envRole === "viewer"
  ) {
    return [envRole as NavRole];
  }

  if (process.env.AUTH_DISABLED === "true") {
    return null;
  }

  return [];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    (pathname.includes(".") && !pathname.startsWith("/api"))
  ) {
    return NextResponse.next();
  }

  const roles = await resolveRoles(request);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (roles !== null && roles.length === 0 && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (roles !== null && roles.length > 0 && pathname === "/login") {
    const home =
      roles[0] === "pos"
        ? "/orders/pos"
        : roles[0] === "kitchen"
          ? "/orders/kitchen"
          : roles[0] === "counter"
            ? "/orders/counter"
            : roles[0] === "viewer"
              ? "/reports"
              : "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (roles !== null && roles.length > 0 && !canAccessPath(pathname, roles)) {
    const home =
      roles[0] === "pos"
        ? "/orders/pos"
        : roles[0] === "kitchen"
          ? "/orders/kitchen"
          : roles[0] === "counter"
            ? "/orders/counter"
            : "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
