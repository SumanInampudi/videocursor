import { getCustomerOptions } from "@/app/actions/customers";
import { getPosMenuData } from "@/app/actions/orders";
import { PosOrderScreen } from "@/components/orders/pos/PosOrderScreen";
import { getAuthContext } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PosOrderPage() {
  const [menu, customers, auth] = await Promise.all([
    getPosMenuData(),
    getCustomerOptions(),
    getAuthContext(),
  ]);

  return (
    <PosOrderScreen
      recipes={menu.recipes}
      categories={menu.categories}
      frequentIds={menu.frequentIds}
      customers={customers}
      showExitLink={!auth.user || isAdminRole(auth.user.role)}
    />
  );
}
