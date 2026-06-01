import { db } from "@/lib/db";
import type { BusinessContext } from "@/lib/business-context";
import type { NavRole } from "@/lib/navigation";
import { NAV_ROLES } from "@/lib/navigation";
import { userRoleToNav } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session-server";
import type { SessionUser } from "@/lib/session-types";

export type { SessionUser };

export type AuthContext = {
  user: SessionUser | null;
  roles: NavRole[] | null;
  business: BusinessContext | null;
};

/** Dev/staging: set APP_ROLE=owner|manager|pos|kitchen|viewer when no session. */
function getEnvDevRoles(): NavRole[] | null {
  const raw = process.env.APP_ROLE?.trim().toLowerCase();
  if (!raw) return null;
  if ((NAV_ROLES as readonly string[]).includes(raw)) {
    return [raw as NavRole];
  }
  return null;
}

async function defaultBusinessContext(role: import("@prisma/client").UserRole = "OWNER"): Promise<BusinessContext | null> {
  const business = await db.business.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!business) return null;
  return {
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    role,
    userId: null,
  };
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getSessionUser();
  if (session) {
    const business: BusinessContext = {
      businessId: session.businessId,
      businessName: session.businessName,
      businessSlug: "",
      role: session.role,
      userId: session.userId,
    };
    const b = await db.business.findUnique({
      where: { id: session.businessId },
      select: { slug: true },
    });
    if (b) business.businessSlug = b.slug;

    return {
      user: session,
      roles: [userRoleToNav(session.role)],
      business,
    };
  }

  const envRoles = getEnvDevRoles();
  if (envRoles) {
    const business = await defaultBusinessContext(
      envRoles[0] === "owner"
        ? "OWNER"
        : envRoles[0] === "manager"
          ? "MANAGER"
          : envRoles[0] === "pos"
            ? "POS"
            : envRoles[0] === "kitchen"
              ? "KITCHEN"
              : "VIEWER"
    );
    return { user: null, roles: envRoles, business };
  }

  const userCount = await db.user.count();
  if (userCount === 0) {
    const business = await defaultBusinessContext("OWNER");
    return { user: null, roles: null, business };
  }

  return { user: null, roles: [], business: null };
}

export { roleLabel } from "@/lib/role-label";
