import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getVisibleQuickActions, type NavRole } from "@/lib/navigation";

export function DashboardQuickActions({ userRoles = null }: { userRoles?: NavRole[] | null }) {
  const actions = getVisibleQuickActions(userRoles);
  if (actions.length === 0) return null;

  return (
    <div className="card mb-6 flex flex-wrap gap-2 p-3">
      {actions.map((a) => (
        <Link key={a.href} href={a.href}>
          <Button variant="outline" size="sm">
            {a.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
