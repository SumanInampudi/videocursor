"use client";

import { Button } from "@/components/ui/Button";
import { buildCsv, downloadCsv } from "@/lib/export-csv";
import { useToast } from "@/components/ui/Toast";

type Row = {
  date: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

export function ExportReportButton({ rows, filename }: { rows: Row[]; filename: string }) {
  const { success } = useToast();

  function handleExport() {
    const csv = buildCsv(
      rows.map((r) => ({
        date: r.date,
        revenue: r.revenue.toFixed(2),
        grossProfit: r.grossProfit.toFixed(2),
        expenses: r.expenses.toFixed(2),
        netProfit: r.netProfit.toFixed(2),
      })),
      ["date", "revenue", "grossProfit", "expenses", "netProfit"]
    );
    downloadCsv(filename, csv);
    success("Report downloaded");
  }

  return (
    <Button type="button" variant="secondary" className="text-sm" onClick={handleExport}>
      Export CSV
    </Button>
  );
}
