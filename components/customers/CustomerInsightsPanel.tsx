import Link from "next/link";
import { formatDateIST } from "@/lib/format";
import { formatCurrency } from "@/lib/units";

type Insights = {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
  stats: {
    orderCount: number;
    totalRevenue: number;
    avgOrderValue: number;
    lastOrderAt: string | Date | null;
    daysSinceLast: number | null;
    segment: string;
    ordersPerMonth: number;
    predictedNextOrderDays: number | null;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    deliveredAt: string | Date | null;
    revenue: number;
  }[];
};

const SEGMENT_LABELS: Record<string, { label: string; hint: string; className: string }> = {
  vip: { label: "VIP", hint: "High value or frequent buyer", className: "bg-purple-100 text-purple-900" },
  repeat: { label: "Repeat", hint: "2+ delivered orders", className: "bg-green-100 text-green-900" },
  new: { label: "New", hint: "Limited order history", className: "bg-blue-100 text-blue-900" },
  inactive: {
    label: "Inactive",
    hint: "No order in 30+ days",
    className: "bg-amber-100 text-amber-900",
  },
};

export function CustomerInsightsPanel({ data }: { data: Insights }) {
  const seg = SEGMENT_LABELS[data.stats.segment] ?? SEGMENT_LABELS.new;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{data.customer.name}</h1>
          <p className="text-sm text-gray-500">
            {[data.customer.phone, data.customer.email].filter(Boolean).join(" · ") || "No contact info"}
          </p>
          <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${seg.className}`}>
            {seg.label} — {seg.hint}
          </span>
        </div>
        <Link href={`/customers/${data.customer.id}/edit`} className="link-brand text-sm">
          Edit customer
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Delivered orders" value={String(data.stats.orderCount)} />
        <StatCard label="Total revenue" value={formatCurrency(data.stats.totalRevenue)} />
        <StatCard label="Avg order value" value={formatCurrency(data.stats.avgOrderValue)} />
        <StatCard
          label="Orders / month (est.)"
          value={data.stats.ordersPerMonth.toFixed(1)}
        />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-servora-charcoal">Marketing signals</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {data.stats.lastOrderAt && (
            <li>
              Last order: {formatDateIST(data.stats.lastOrderAt)}
              {data.stats.daysSinceLast != null && ` (${data.stats.daysSinceLast} days ago)`}
            </li>
          )}
          {data.stats.predictedNextOrderDays != null && data.stats.orderCount > 1 && (
            <li>
              Rough next-order window: ~{data.stats.predictedNextOrderDays} days (based on past frequency)
            </li>
          )}
          {data.stats.segment === "inactive" && (
            <li className="text-amber-800">Consider a win-back offer — customer may be churning.</li>
          )}
          {data.stats.segment === "vip" && (
            <li className="text-purple-800">Priority customer — loyalty or volume rewards may help retention.</li>
          )}
        </ul>
      </section>

      {data.customer.notes && (
        <section className="filter-bar text-sm text-gray-600">
          <strong>Notes:</strong> {data.customer.notes}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent delivered orders</h2>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No delivered orders yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex justify-between px-4 py-3 text-sm">
                <Link href={`/orders/${o.id}`} className="font-medium hover:text-servora-yellow">
                  {o.orderNumber}
                </Link>
                <span>
                  {formatCurrency(o.revenue)}
                  {o.deliveredAt && (
                    <span className="ml-2 text-gray-400">{formatDateIST(o.deliveredAt)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-padded shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-servora-charcoal">{value}</p>
    </div>
  );
}
