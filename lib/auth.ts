import { db } from "@/lib/db";
import type { NavRole } from "@/lib/navigation";
import { NAV_ROLES } from "@/lib/navigation";
import { userRoleToNav } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session-server";
import type { SessionUser } from "@/lib/session-types";

export type { SessionUser };

export type AuthContext = {
  user: SessionUser | null;
  roles: NavRole[] | null;
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

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getSessionUser();
  if (session) {
    return {
      user: session,
      roles: [userRoleToNav(session.role)],
    };
  }

  const envRoles = getEnvDevRoles();
  if (envRoles) {
    return { user: null, roles: envRoles };
  }

  const userCount = await db.user.count();
  if (userCount === 0) {
    return { user: null, roles: null };
  }

  return { user: null, roles: [] };
}

export { roleLabel } from "@/lib/role-label";
