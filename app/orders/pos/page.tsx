import { getCustomerOptions } from "@/app/actions/customers";
import { getPosMenuData } from "@/app/actions/orders";
import { getProductAvailabilityMap } from "@/app/actions/products";
import { getTaxSettingsSerialized } from "@/app/actions/tax-settings";
import { getPosRegisterData } from "@/app/actions/venue";
import { PosOrderScreen } from "@/components/orders/pos/PosOrderScreen";
import { getAuthContext } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PosOrderPage() {
  const [menu, customers, register, taxSettings, auth, availability] = await Promise.all([
    getPosMenuData(),
    getCustomerOptions(),
    getPosRegisterData(),
    getTaxSettingsSerialized(),
    getAuthContext(),
    getProductAvailabilityMap(),
  ]);

  return (
    <PosOrderScreen
      products={menu.products}
      variantGroups={menu.variantGroups}
      categories={menu.categories}
      frequentIds={menu.frequentIds}
      availability={availability}
      customers={customers}
      venue={register.venue}
      tables={register.tables}
      taxSettings={taxSettings}
      showExitLink={!auth.user || isAdminRole(auth.user.role)}
      canManageDiscounts={
        auth.user
          ? isAdminRole(auth.user.role)
          : auth.roles?.includes("owner") ||
            auth.roles?.includes("manager") ||
            auth.roles === null
      }
    />
  );
}
