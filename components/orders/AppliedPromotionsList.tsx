import { formatCurrency } from "@/lib/units";

export type AppliedPromotionRow = {
  name: string;
  code?: string | null;
  discountAmount: number;
  kind?: string;
};

type AppliedPromotionsListProps = {
  promotions: AppliedPromotionRow[];
  totalDiscount: number;
  compact?: boolean;
};

export function AppliedPromotionsList({
  promotions,
  totalDiscount,
  compact = false,
}: AppliedPromotionsListProps) {
  if (totalDiscount <= 0 && promotions.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-green-100 bg-green-50/60 ${
        compact ? "px-3 py-2" : "p-3"
      }`}
    >
      <p className={`font-medium text-green-900 ${compact ? "text-xs" : "text-sm"}`}>
        Discount applied at checkout
      </p>
      {promotions.length > 0 && (
        <ul className={`mt-1.5 space-y-0.5 ${compact ? "text-xs" : "text-sm"} text-green-800`}>
          {promotions.map((row) => (
            <li key={`${row.name}-${row.code ?? "auto"}`} className="flex justify-between gap-2">
              <span className="truncate">
                {row.name}
                {row.code ? ` (${row.code})` : ""}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                −{formatCurrency(row.discountAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`mt-1.5 flex justify-between border-t border-green-200/80 pt-1.5 font-semibold text-green-900 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        <span>Total savings</span>
        <span className="tabular-nums">−{formatCurrency(totalDiscount)}</span>
      </div>
    </div>
  );
}
