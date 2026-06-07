import { DataTable } from "@/components/ui/DataTable";
import type { StockReceiveLineSummary } from "@/lib/stock-receive-summary";
import { formatCurrency, formatQuantity } from "@/lib/units";

type ReceiveSummaryLinesProps = {
  lines: StockReceiveLineSummary[];
  compact?: boolean;
};

export function ReceiveSummaryLines({ lines, compact = false }: ReceiveSummaryLinesProps) {
  if (lines.length === 0) {
    return <p className="text-sm text-gray-500">No lines</p>;
  }

  return (
    <DataTable>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="text-right">Qty</th>
            {!compact && <th className="text-right">Cost / unit</th>}
            <th className="text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={`${line.name}-${i}`}>
              <td className="font-medium">{line.name}</td>
              <td className="text-right text-muted tabular-nums">
                {formatQuantity(line.quantity, line.unit)}
              </td>
              {!compact && (
                <td className="text-right text-muted tabular-nums">
                  {formatCurrency(line.unitCost)}
                </td>
              )}
              <td className="text-right tabular-nums">{formatCurrency(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
