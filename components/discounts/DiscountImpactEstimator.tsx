"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getDiscountImpactEstimate,
  previewDiscountImpact,
} from "@/app/actions/discounts";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/units";

type PromotionKind =
  | "CHECK_PERCENT"
  | "CHECK_FIXED"
  | "ITEM_PERCENT"
  | "ITEM_FIXED"
  | "BOGO"
  | "COMBO_PRICE"
  | "TIERED_SPEND"
  | "TIERED_QUANTITY"
  | "CUSTOMER_SEGMENT";

type ImpactResult = {
  avgOrderValue: number;
  grossMarginRate: number;
  sampleOrderCount: number;
  discountPerOrder: number;
  grossProfitPerOrder: number;
  profitAfterDiscountPerOrder: number;
  usesCount: number;
  totalDiscountCost: number;
  totalProfitLost: number;
  breakEvenExtraRevenue: number;
  weeklyDiscountCost: number;
  monthlyDiscountCost: number;
  hasBaselineData: boolean;
  discountName?: string;
  discountCode?: string;
  actualUsesLast30Days?: number;
  redemptionCount?: number;
};

type DiscountImpactEstimatorProps = {
  discountId?: string;
  draft?: {
    kind: PromotionKind;
    value: number;
    minOrderAmount?: number | null;
    maxDiscountAmount?: number | null;
  };
};

const TIERED_KINDS = new Set(["TIERED_SPEND", "TIERED_QUANTITY", "BOGO", "COMBO_PRICE"]);

export function DiscountImpactEstimator({ discountId, draft }: DiscountImpactEstimatorProps) {
  const [uses, setUses] = useState("50");
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const kind = draft?.kind;
  const canEstimate = discountId != null || (draft != null && draft.value > 0 && kind != null);
  const tieredNote = kind && TIERED_KINDS.has(kind);

  useEffect(() => {
    if (!canEstimate) {
      setImpact(null);
      return;
    }

    const usesNum = Math.max(0, Number(uses) || 0);
    const timer = setTimeout(() => {
      startTransition(async () => {
        if (draft && draft.value > 0) {
          const result = await previewDiscountImpact({
            kind: draft.kind,
            value: draft.value,
            minOrderAmount: draft.minOrderAmount,
            maxDiscountAmount: draft.maxDiscountAmount,
            expectedUses: usesNum,
          });
          if (discountId) {
            const saved = await getDiscountImpactEstimate(discountId, usesNum);
            setImpact({
              ...(result as ImpactResult),
              actualUsesLast30Days: saved?.actualUsesLast30Days,
              redemptionCount: saved?.redemptionCount,
              discountName: saved?.discountName,
              discountCode: saved?.discountCode,
            });
          } else {
            setImpact(result as ImpactResult);
          }
          return;
        }
        if (discountId) {
          const result = await getDiscountImpactEstimate(discountId, usesNum);
          setImpact(result as ImpactResult | null);
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [
    canEstimate,
    discountId,
    draft?.kind,
    draft?.value,
    draft?.minOrderAmount,
    draft?.maxDiscountAmount,
    uses,
  ]);

  return (
    <section className="card-padded mt-8 space-y-4">
      <div>
        <h2 className="section-title">Revenue impact</h2>
        <p className="form-hint mt-1">
          See what this promotion costs you per order and if used many times. Based on your last 30
          days of delivered orders for average bill size and gross margin.
        </p>
      </div>

      <Input
        label="If this promotion is used this many times"
        type="number"
        min="0"
        step="1"
        value={uses}
        onChange={(e) => setUses(e.target.value)}
        className="max-w-xs"
        hint="e.g. 100 orders in a month"
      />

      {tieredNote && (
        <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Estimate uses a simplified bill-wide model. BOGO, combo, and tiered promos may cost more
          or less per order depending on the cart.
        </p>
      )}

      {!canEstimate && (
        <p className="text-sm text-gray-500">Set a discount value to see the impact estimate.</p>
      )}

      {isPending && canEstimate && (
        <p className="text-sm text-gray-500">Calculating…</p>
      )}

      {impact && !isPending && (
        <div className="space-y-4">
          {!impact.hasBaselineData && (
            <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              No delivered orders in the last 30 days — using 55% assumed gross margin for estimates.
            </p>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-servora-charcoal">Per order (at avg bill)</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Metric
                label="Avg order value"
                value={formatCurrency(impact.avgOrderValue)}
                hint={
                  impact.sampleOrderCount > 0
                    ? `${impact.sampleOrderCount} orders sampled`
                    : "Assumed baseline"
                }
              />
              <Metric
                label="Gross margin"
                value={`${(impact.grossMarginRate * 100).toFixed(1)}%`}
              />
              <Metric
                label="Discount you give"
                value={formatCurrency(impact.discountPerOrder)}
                highlight="cost"
              />
              <Metric
                label="Gross profit before promo"
                value={formatCurrency(impact.grossProfitPerOrder)}
              />
              <Metric
                label="Profit after promo"
                value={formatCurrency(impact.profitAfterDiscountPerOrder)}
                highlight={impact.profitAfterDiscountPerOrder < impact.grossProfitPerOrder ? "warn" : undefined}
              />
            </dl>
          </div>

          <div className="rounded-lg border border-red-100 bg-red-50/50 p-4">
            <h3 className="text-sm font-semibold text-red-900">
              If used {impact.usesCount} times
            </h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Metric
                label="Total discount cost"
                value={formatCurrency(impact.totalDiscountCost)}
                hint="Revenue you give away"
                highlight="cost"
              />
              <Metric
                label="Profit you lose"
                value={formatCurrency(impact.totalProfitLost)}
                hint="Same as discount cost — comes straight off margin"
                highlight="cost"
              />
              <Metric
                label="Extra sales to break even"
                value={formatCurrency(impact.breakEvenExtraRevenue)}
                hint={`Additional revenue needed at ${(impact.grossMarginRate * 100).toFixed(0)}% margin to offset the discount`}
                className="sm:col-span-2"
              />
            </dl>
          </div>

          {impact.actualUsesLast30Days != null && (
            <p className="text-xs text-gray-500">
              Actual uses in last 30 days: {impact.actualUsesLast30Days}
              {impact.redemptionCount != null ? ` · ${impact.redemptionCount} lifetime` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  highlight,
  className = "",
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: "cost" | "warn";
  className?: string;
}) {
  const valueClass =
    highlight === "cost"
      ? "text-red-700"
      : highlight === "warn"
        ? "text-amber-800"
        : "text-servora-charcoal";

  return (
    <div className={`rounded-lg border border-gray-100 bg-gray-50/60 p-3 ${className}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className={`mt-1 text-base font-semibold tabular-nums ${valueClass}`}>{value}</dd>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
