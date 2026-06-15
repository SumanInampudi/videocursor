import { DataTable } from "@/components/ui/DataTable";
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
    <DataTable>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th className="text-right">Revenue</th>
            <th className="text-right">Gross profit</th>
            <th className="text-right">Expenses</th>
            <th className="text-right">Net profit</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((row) => (
            <tr key={row.date}>
              <td className="font-medium">{formatDateIST(row.date + "T12:00:00")}</td>
              <td className="text-right tabular-nums">{formatCurrency(row.revenue)}</td>
              <td className="text-right tabular-nums">{formatCurrency(row.grossProfit)}</td>
              <td className="text-right tabular-nums">{formatCurrency(row.expenses)}</td>
              <td
                className={`text-right font-medium tabular-nums ${
                  row.netProfit < 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                {formatCurrency(row.netProfit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
