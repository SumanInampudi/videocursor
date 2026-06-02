import { formatDateIST } from "@/lib/format";
import { formatCurrency } from "@/lib/units";

type DayRow = {
  date: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

export function ProfitHistoryTable({ rows }: { rows: DayRow[] }) {
  const recent = [...rows].reverse().slice(0, 14);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="table-panel">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Revenue
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Gross profit
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Expenses
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Net profit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {recent.map((row) => (
            <tr key={row.date} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-servora-charcoal">
                {formatDateIST(row.date + "T12:00:00")}
              </td>
              <td className="px-4 py-2 text-right">{formatCurrency(row.revenue)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(row.grossProfit)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(row.expenses)}</td>
              <td
                className={`px-4 py-2 text-right font-medium ${
                  row.netProfit < 0 ? "text-servora-red" : "text-green-700"
                }`}
              >
                {formatCurrency(row.netProfit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
