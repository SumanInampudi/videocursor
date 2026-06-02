import Link from "next/link";
import { getPayablesSummary } from "@/app/actions/purchases";
import { PayablesBySupplierDay } from "@/components/inventory/PayablesBySupplierDay";
import { PayablesTable } from "@/components/inventory/PayablesTable";
import type { PayablesBySupplierGroup } from "@/lib/payables-by-day";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  const { purchases, totalOwed, count, bySupplierDay } = await getPayablesSummary();
  const supplierGroups = (bySupplierDay ?? []) as PayablesBySupplierGroup[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/inventory" className="link-brand text-sm">
            ← Inventory
          </Link>
          <h1 className="mt-2 page-title">Supplier payables</h1>
          <p className="text-sm text-gray-500">
            Amounts you still owe for inventory bought on credit. Paying suppliers reduces this
            balance; it is separate from COGS on sold orders.
          </p>
        </div>
        <Link href="/inventory/receive">
          <Button>Receive stock</Button>
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-servora-red/30 bg-red-50 p-4">
        <p className="text-sm text-gray-600">Total owed to suppliers</p>
        <p className="text-2xl font-bold text-servora-red">{formatCurrency(totalOwed)}</p>
        <p className="text-xs text-gray-500">{count} open purchase(s)</p>
      </div>

      <PayablesBySupplierDay groups={supplierGroups} />

      <PayablesTable purchases={purchases} />
    </div>
  );
}
