import type { NavRole } from "@/lib/navigation";
import { NAV_ROLES } from "@/lib/navigation";

/** Dev/staging: set APP_ROLE=owner|manager|kitchen|viewer to test nav filtering. */
export function getServerRoles(): NavRole[] | null {
  const raw = process.env.APP_ROLE?.trim().toLowerCase();
  if (!raw) return null;
  if ((NAV_ROLES as readonly string[]).includes(raw)) {
    return [raw as NavRole];
  }
  return null;
}

export function roleLabel(role: NavRole): string {
  const labels: Record<NavRole, string> = {
    owner: "Owner",
    manager: "Manager",
    kitchen: "Kitchen",
    viewer: "Viewer",
  };
  return labels[role];
}
