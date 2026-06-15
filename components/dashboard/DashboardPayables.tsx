import Link from "next/link";
import { getPayablesSummary } from "@/app/actions/purchases";
import { formatCurrency } from "@/lib/units";

export async function DashboardPayables() {
  const { totalOwed, count } = await getPayablesSummary();

  if (count === 0) {
    return (
      <div className="card-padded shadow-sm">
        <p className="text-sm text-gray-500">Supplier payables</p>
        <p className="mt-1 text-sm text-green-700">No open balances</p>
      </div>
    );
  }

  return (
    <Link
      href="/inventory/payables"
      className="block rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm transition hover:border-red-300"
    >
      <p className="text-sm font-medium text-red-900">Owed to suppliers</p>
      <p className="mt-1 text-2xl font-bold text-servora-red">{formatCurrency(totalOwed)}</p>
      <p className="mt-1 text-xs text-red-800">
        {count} open purchase{count === 1 ? "" : "s"} (credit / partial) · View payables →
      </p>
    </Link>
  );
}
