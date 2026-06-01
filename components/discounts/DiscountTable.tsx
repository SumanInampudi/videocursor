"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateIST } from "@/lib/format";
import { formatCurrency } from "@/lib/units";

type DiscountRow = {
  id: string;
  code: string;
  name: string;
  type: "PERCENT" | "FIXED";
  value: number | { toNumber(): number };
  minOrderAmount: number | null | { toNumber(): number };
  isActive: boolean;
  validFrom: string | Date | null;
  validTo: string | Date | null;
};

function num(v: number | { toNumber(): number }): number {
  return typeof v === "number" ? v : v.toNumber();
}

function formatValue(d: DiscountRow) {
  const value = num(d.value);
  if (d.type === "PERCENT") return `${value}%`;
  return formatCurrency(value);
}

export function DiscountTable({ discounts }: { discounts: DiscountRow[] }) {
  if (discounts.length === 0) {
    return <p className="text-sm text-gray-500">No discounts yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Offer</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Validity</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {discounts.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono font-medium">{d.code}</td>
              <td className="px-4 py-3">
                {d.name} · {formatValue(d)}
                {d.minOrderAmount != null && num(d.minOrderAmount) > 0 && (
                  <span className="text-gray-400"> (min {formatCurrency(num(d.minOrderAmount))})</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {d.validFrom ? formatDateIST(d.validFrom) : "—"} →{" "}
                {d.validTo ? formatDateIST(d.validTo) : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={d.isActive ? "success" : "default"}>
                  {d.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/discounts/${d.id}/edit`}>
                  <Button variant="ghost" className="text-xs">
                    Edit
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
