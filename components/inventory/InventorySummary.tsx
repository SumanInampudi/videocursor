import Link from "next/link";
import { formatCurrency } from "@/lib/units";

type InventorySummaryProps = {
  summary: {
    totalItems: number;
    activeItems: number;
    lowStockCount: number;
    totalStockValue: number;
    totalPayables: number;
    creditPurchaseCount: number;
  };
};

export function InventorySummary({ summary }: InventorySummaryProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Stock on hand (value)"
        value={formatCurrency(summary.totalStockValue)}
        hint="Quantity × cost per unit (active items)"
      />
      <SummaryCard
        label="Active SKUs"
        value={String(summary.activeItems)}
        hint={`${summary.totalItems} total including inactive`}
      />
      <SummaryCard
        label="Low stock"
        value={String(summary.lowStockCount)}
        hint="At or below reorder level"
        highlight={summary.lowStockCount > 0 ? "warning" : undefined}
        href={summary.lowStockCount > 0 ? "/inventory?lowStock=true" : undefined}
      />
      <SummaryCard
        label="Owed to suppliers"
        value={formatCurrency(summary.totalPayables)}
        hint={
          summary.creditPurchaseCount > 0
            ? `${summary.creditPurchaseCount} open credit purchase(s)`
            : "No open credit purchases"
        }
        highlight={summary.totalPayables > 0 ? "danger" : undefined}
        href="/inventory/payables"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  highlight,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: "warning" | "danger";
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight === "danger"
            ? "text-servora-red"
            : highlight === "warning"
              ? "text-amber-700"
              : "text-servora-charcoal"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
