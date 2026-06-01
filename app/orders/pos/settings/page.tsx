import Link from "next/link";
import { getPosCategorySettings } from "@/app/actions/pos-settings";
import { getDiningTablesForAdmin, getVenuePosSettings } from "@/app/actions/venue";
import { PosExitLink } from "@/components/layout/PosShell";
import { DiningTablesManager } from "@/components/orders/pos/DiningTablesManager";
import { ReservationsPanel } from "@/components/orders/pos/ReservationsPanel";
import { PosCategoryOrderEditor } from "@/components/orders/pos/PosCategoryOrderEditor";
import { TaxSettingsForm } from "@/components/orders/pos/TaxSettingsForm";
import { VenueSettingsForm } from "@/components/orders/pos/VenueSettingsForm";
import { getTaxSettingsSerialized } from "@/app/actions/tax-settings";

export const dynamic = "force-dynamic";

export default async function PosSettingsPage() {
  const [{ allCategories, ordered, savedOrder }, venue, tables, taxSettings] =
    await Promise.all([
      getPosCategorySettings(),
      getVenuePosSettings(),
      getDiningTablesForAdmin(),
      getTaxSettingsSerialized(),
    ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 safe-area-top">
        <PosExitLink />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-servora-charcoal">POS & venue settings</h1>
        </div>
        <Link
          href="/orders/pos"
          className="touch-target rounded-lg bg-servora-yellow px-4 py-2 text-sm font-medium text-white"
        >
          Back to register
        </Link>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        <VenueSettingsForm initial={venue} />
        <TaxSettingsForm initial={taxSettings} />
        <DiningTablesManager tables={tables} />
        <ReservationsPanel tables={tables} />
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-servora-charcoal">Menu category order</h2>
          <div className="mt-4">
            <PosCategoryOrderEditor initialOrder={ordered} allCategories={allCategories} />
          </div>
          {savedOrder.length === 0 && allCategories.length > 0 && (
            <p className="mt-4 text-xs text-gray-500">
              No custom order saved yet — using alphabetical until you save.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
