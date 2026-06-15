import { formatCurrency } from "@/lib/units";
import type { PayablesBySupplierGroup } from "@/lib/payables-by-day";

type PayablesBySupplierDayProps = {
  groups: PayablesBySupplierGroup[];
};

export function PayablesBySupplierDay({ groups }: PayablesBySupplierDayProps) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="section-title">Credit by supplier & day</h2>
      <p className="text-sm text-gray-500">
        Amounts still owed from stock received on credit, grouped by supplier and purchase date.
      </p>
      {groups.map((group) => (
        <section
          key={group.supplier}
          className="rounded-lg border border-gray-200 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
            <h3 className="font-semibold text-servora-charcoal">{group.supplier}</h3>
            <span className="text-sm font-bold text-servora-red tabular-nums">
              {formatCurrency(group.totalOwed)} owed
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.byDay.map((day) => (
              <div key={day.date} className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{day.date}</span>
                  <span className="font-semibold text-servora-red tabular-nums">
                    {formatCurrency(day.totalOwed)}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-gray-600">
                  {day.purchases.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{p.description}</span>
                      <span className="shrink-0 tabular-nums">{formatCurrency(p.balance)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
