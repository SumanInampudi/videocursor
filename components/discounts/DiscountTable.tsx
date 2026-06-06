"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPromotionValue } from "@/lib/discount-calc";
import { formatDateIST } from "@/lib/format";
import { formatCurrency } from "@/lib/units";

type DiscountRow = {
  id: string;
  code: string;
  name: string;
  kind:
    | "CHECK_PERCENT"
    | "CHECK_FIXED"
    | "ITEM_PERCENT"
    | "ITEM_FIXED"
    | "BOGO"
    | "COMBO_PRICE"
    | "TIERED_SPEND"
    | "TIERED_QUANTITY"
    | "MANAGER_OPEN"
    | "COMP_ITEM"
    | "CUSTOMER_SEGMENT";
  value: number | { toNumber(): number };
  minOrderAmount: number | null | { toNumber(): number };
  application?: "CODE" | "AUTO" | "MANAGER" | "PAYMENT_METHOD";
  redemptionCount?: number;
  isActive: boolean;
  validFrom: string | Date | null;
  validTo: string | Date | null;
};

function num(v: number | { toNumber(): number }): number {
  return typeof v === "number" ? v : v.toNumber();
}

export function DiscountTable({ discounts }: { discounts: DiscountRow[] }) {
  if (discounts.length === 0) {
    return <p className="text-sm text-gray-500">No promotions yet.</p>;
  }

  return (
    <div className="table-panel">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Offer</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Mode</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Uses</th>
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
                {d.name} · {formatPromotionValue(d.kind, num(d.value))}
                {d.minOrderAmount != null && num(d.minOrderAmount) > 0 && (
                  <span className="text-gray-400"> (min {formatCurrency(num(d.minOrderAmount))})</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {d.application === "AUTO"
                  ? "Auto"
                  : d.application === "PAYMENT_METHOD"
                    ? "Payment"
                  : d.application === "MANAGER"
                    ? "Manager"
                    : "Code"}
              </td>
              <td className="px-4 py-3 text-gray-600">{d.redemptionCount ?? 0}</td>
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
