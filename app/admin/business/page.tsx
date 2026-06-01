import { redirect } from "next/navigation";
import { getBusinesses } from "@/app/actions/business";
import { BusinessAdminPanel } from "@/components/admin/BusinessAdminPanel";
import { getAuthContext } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminBusinessPage() {
  const { user } = await getAuthContext();
  if (!user || !isAdminRole(user.role)) {
    redirect("/login?next=/admin/business");
  }

  const businesses = await getBusinesses();

  return (
    <div>
      <h1 className="text-2xl font-bold text-servora-charcoal">Businesses</h1>
      <p className="mt-2 text-sm text-gray-500">
        Each business has its own menu, tables, orders, and team. Users pick a business at
        login when they belong to more than one.
      </p>
      <BusinessAdminPanel businesses={businesses} currentBusinessId={user.businessId} />
    </div>
  );
}
