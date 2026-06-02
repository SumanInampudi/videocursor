import { redirect } from "next/navigation";
import { getUsers } from "@/app/actions/auth";
import { UserAdminPanel } from "@/components/admin/UserAdminPanel";
import { getAuthContext } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { user } = await getAuthContext();
  if (!user || !isAdminRole(user.role)) {
    redirect("/login?next=/admin/users");
  }

  const users = await getUsers();

  return (
    <div>
      <h1 className="page-title">Team & roles</h1>
      <p className="mt-2 text-sm text-gray-500">
        Admin (full access), POS (register only), Kitchen (kitchen display only).
      </p>
      <UserAdminPanel users={users} />
    </div>
  );
}
