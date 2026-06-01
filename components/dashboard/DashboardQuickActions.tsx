import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getVisibleQuickActions, type NavRole } from "@/lib/navigation";

export function DashboardQuickActions({ userRoles = null }: { userRoles?: NavRole[] | null }) {
  const actions = getVisibleQuickActions(userRoles);
  if (actions.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link key={a.href} href={a.href}>
          <Button variant="secondary" className="text-sm">
            {a.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
