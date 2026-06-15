import { formatCurrency } from "@/lib/units";
import { promotionKindLabel } from "@/lib/discount-calc";

type AppliedPromotionRow = {
  id: string;
  name: string;
  code: string | null;
  kind: string;
  discountAmount: number | { toString(): string };
  reason?: string | null;
  lineDiscounts?: {
    discountAmount: number | { toString(): string };
    grossRevenue: number | { toString(): string };
    orderLineItem: { productName: string };
  }[];
};

function num(value: number | { toString(): string }): number {
  return typeof value === "number" ? value : Number(value);
}

export function OrderPromotionsBreakdown({
  promotions,
  discountTotal,
}: {
  promotions: AppliedPromotionRow[];
  discountTotal: number;
}) {
  if (promotions.length === 0 && discountTotal <= 0) return null;

  return (
    <section className="card-padded">
      <h3 className="section-title mb-3">Promotion breakdown</h3>
      <div className="space-y-3 text-sm">
        {promotions.map((promotion) => (
          <div key={promotion.id} className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-servora-charcoal">{promotion.name}</p>
                <p className="text-xs text-gray-500">
                  {promotionKindLabel(promotion.kind as never)}
                  {promotion.code
                    ? ` · ${promotion.code}`
                    : promotion.kind === "MANAGER_OPEN" || promotion.kind === "COMP_ITEM"
                      ? " · Manager"
                      : " · Auto-applied"}
                  {promotion.reason ? ` · ${promotion.reason}` : ""}
                </p>
              </div>
              <p className="font-semibold text-green-700">
                −{formatCurrency(num(promotion.discountAmount))}
              </p>
            </div>
            {promotion.lineDiscounts && promotion.lineDiscounts.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                {promotion.lineDiscounts
                  .filter((row) => num(row.discountAmount) > 0)
                  .map((row, index) => (
                    <li key={`${promotion.id}-${index}`} className="flex justify-between gap-3">
                      <span>{row.orderLineItem.productName}</span>
                      <span>−{formatCurrency(num(row.discountAmount))}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
        {discountTotal > 0 && (
          <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
            <span>Total discount</span>
            <span className="text-green-700">−{formatCurrency(discountTotal)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
