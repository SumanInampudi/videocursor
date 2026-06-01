import type { NavRole } from "@/lib/navigation";

export function roleLabel(role: NavRole): string {
  const labels: Record<NavRole, string> = {
    owner: "Admin",
    manager: "Manager",
    pos: "POS",
    kitchen: "Kitchen",
    viewer: "Viewer",
  };
  return labels[role];
}
