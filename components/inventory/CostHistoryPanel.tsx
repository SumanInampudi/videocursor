import { getInventoryCostHistory } from "@/app/actions/pricing";
import { formatCurrency } from "@/lib/units";

type CostHistoryPanelProps = {
  inventoryItemId: string;
};

export async function CostHistoryPanel({ inventoryItemId }: CostHistoryPanelProps) {
  const history = await getInventoryCostHistory(inventoryItemId);

  return (
    <section className="mt-8 filter-bar">
      <h2 className="mb-1 text-sm font-semibold text-servora-charcoal">
        Cost price history
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Each time you change cost per unit on this item, a snapshot is recorded. When an
        order is marked ready, ingredient costs use the current inventory price at that
        moment (stored on the order for profit reporting).
      </p>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No cost changes recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Previous
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  New cost / unit
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-600">
                    {new Date(row.effectiveAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {row.previousCost != null
                      ? formatCurrency(Number(row.previousCost))
                      : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {formatCurrency(Number(row.costPerUnit))}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{row.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
