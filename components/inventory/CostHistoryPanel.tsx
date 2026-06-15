import { getInventoryCostHistory } from "@/app/actions/pricing";
import { DataTable } from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/units";

type CostHistoryPanelProps = {
  inventoryItemId: string;
};

export async function CostHistoryPanel({ inventoryItemId }: CostHistoryPanelProps) {
  const history = await getInventoryCostHistory(inventoryItemId);

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-sm font-semibold text-charcoal">Cost price history</h2>
      <p className="mb-4 text-xs text-gray-500">
        Each time you change cost per unit on this item, a snapshot is recorded. When an
        order is marked ready, raw material costs use the current inventory price at that
        moment (stored on the order for profit reporting).
      </p>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No cost changes recorded yet.</p>
      ) : (
        <DataTable>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Previous</th>
                <th>New cost / unit</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="text-muted">
                    {new Date(row.effectiveAt).toLocaleString()}
                  </td>
                  <td className="tabular-nums">
                    {row.previousCost != null
                      ? formatCurrency(Number(row.previousCost))
                      : "—"}
                  </td>
                  <td className="font-medium tabular-nums">
                    {formatCurrency(Number(row.costPerUnit))}
                  </td>
                  <td className="text-subtle">{row.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </section>
  );
}
