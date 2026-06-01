import Link from "next/link";
import { getPosCategorySettings } from "@/app/actions/pos-settings";
import { PosExitLink } from "@/components/layout/PosShell";
import { PosCategoryOrderEditor } from "@/components/orders/pos/PosCategoryOrderEditor";

export const dynamic = "force-dynamic";

export default async function PosSettingsPage() {
  const { allCategories, ordered, savedOrder } = await getPosCategorySettings();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 safe-area-top">
        <PosExitLink />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-servora-charcoal">POS settings</h1>
        </div>
        <Link
          href="/orders/pos"
          className="touch-target rounded-lg bg-servora-yellow px-4 py-2 text-sm font-medium text-white"
        >
          Back to register
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <PosCategoryOrderEditor initialOrder={ordered} allCategories={allCategories} />
        {savedOrder.length === 0 && allCategories.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            No custom order saved yet — using alphabetical until you save.
          </p>
        )}
      </div>
    </div>
  );
}
