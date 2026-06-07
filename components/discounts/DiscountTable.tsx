"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
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
    <DataTable>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Offer</th>
            <th>Mode</th>
            <th>Uses</th>
            <th>Validity</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {discounts.map((d) => (
            <tr key={d.id}>
              <td className="font-mono font-medium">{d.code}</td>
              <td>
                {d.name} · {formatPromotionValue(d.kind, num(d.value))}
                {d.minOrderAmount != null && num(d.minOrderAmount) > 0 && (
                  <span className="text-gray-400"> (min {formatCurrency(num(d.minOrderAmount))})</span>
                )}
              </td>
              <td className="text-subtle text-xs">
                {d.application === "AUTO"
                  ? "Auto"
                  : d.application === "PAYMENT_METHOD"
                    ? "Payment"
                    : d.application === "MANAGER"
                      ? "Manager"
                      : "Code"}
              </td>
              <td className="text-muted tabular-nums">{d.redemptionCount ?? 0}</td>
              <td className="text-subtle text-xs">
                {d.validFrom ? formatDateIST(d.validFrom) : "—"} →{" "}
                {d.validTo ? formatDateIST(d.validTo) : "—"}
              </td>
              <td className="text-subtle">{d.isActive ? "Active" : "Inactive"}</td>
              <td className="text-right">
                <Link href={`/discounts/${d.id}/edit`}>
                  <Button variant="ghost" className="px-2 py-1 text-xs">
                    Edit
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
