import { redirect } from "next/navigation";
import { DataMigrationPanel } from "@/components/admin/DataMigrationPanel";
import { getAuthContext } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDataPage() {
  const { user } = await getAuthContext();
  if (!user || !isAdminRole(user.role)) {
    redirect("/login?next=/admin/data");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-servora-charcoal">Import & export data</h1>
      <p className="mt-2 text-sm text-gray-500">
        Migrate an existing restaurant into Servora using CSV templates. Export anytime for
        backup or analysis.
      </p>
      <div className="mt-8">
        <DataMigrationPanel />
      </div>
    </div>
  );
}
