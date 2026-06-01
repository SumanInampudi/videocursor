import { getCustomerOptions } from "@/app/actions/customers";
import { getPosMenuData } from "@/app/actions/orders";
import { getTaxSettingsSerialized } from "@/app/actions/tax-settings";
import { getPosRegisterData } from "@/app/actions/venue";
import { PosOrderScreen } from "@/components/orders/pos/PosOrderScreen";
import { getAuthContext } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PosOrderPage() {
  const [menu, customers, register, taxSettings, auth] = await Promise.all([
    getPosMenuData(),
    getCustomerOptions(),
    getPosRegisterData(),
    getTaxSettingsSerialized(),
    getAuthContext(),
  ]);

  return (
    <PosOrderScreen
      recipes={menu.recipes}
      categories={menu.categories}
      frequentIds={menu.frequentIds}
      customers={customers}
      venue={register.venue}
      tables={register.tables}
      taxSettings={taxSettings}
      showExitLink={!auth.user || isAdminRole(auth.user.role)}
    />
  );
}
