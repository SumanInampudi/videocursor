import Link from "next/link";
import { getStockReceiveHistory } from "@/app/actions/stock-receive";
import { ReceiveHistoryTable } from "@/components/inventory/receive/ReceiveHistoryTable";
import { Button } from "@/components/ui/Button";
import { defaultReportDateRange } from "@/lib/dates";
import type { StockReceiveBatchSummary } from "@/lib/stock-receive-summary";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  from?: string;
  to?: string;
}>;

export default async function StockReceiveHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const defaults = defaultReportDateRange();
  const from = params.from ?? defaults.from;
  const to = params.to ?? defaults.to;

  const data = await getStockReceiveHistory({ from, to });
  const batches = (data.batches ?? []) as StockReceiveBatchSummary[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/inventory/receive"
            className="text-sm text-servora-yellow hover:underline"
          >
            ← Stock receive
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Stock history</h1>
          <p className="text-sm text-gray-500">
            Stock receives from the receive screen and manual edits from{" "}
            <strong>Inventory → Edit item</strong> (quantity or cost changes). Expand a row
            for line details. Cost-only snapshots also appear on each item&apos;s edit page.
          </p>
        </div>
        <Link href="/inventory/receive">
          <Button>New receive</Button>
        </Link>
      </div>

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-medium text-gray-500">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-medium text-gray-500">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit">Apply</Button>
      </form>

      <p className="mb-3 text-sm text-gray-600">
        {batches.length} receive{batches.length === 1 ? "" : "s"} between {from} and {to}
      </p>

      <ReceiveHistoryTable batches={batches} />
    </div>
  );
}
