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
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              Item
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
              Qty
            </th>
            {!compact && (
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                Cost / unit
              </th>
            )}
            <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
              Line total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {lines.map((line, i) => (
            <tr key={`${line.name}-${i}`}>
              <td className="px-3 py-2 font-medium text-servora-charcoal">{line.name}</td>
              <td className="px-3 py-2 text-right text-gray-600">
                {formatQuantity(line.quantity, line.unit)}
              </td>
              {!compact && (
                <td className="px-3 py-2 text-right text-gray-600">
                  {formatCurrency(line.unitCost)}
                </td>
              )}
              <td className="px-3 py-2 text-right font-medium">
                {formatCurrency(line.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
