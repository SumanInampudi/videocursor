"use client";

import { useState, useTransition } from "react";
import { getDiscountImpactEstimate } from "@/app/actions/discounts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/units";

type ImpactData = {
  discountName: string;
  discountCode: string;
  avgOrderValue: number;
  grossMarginRate: number;
  sampleOrderCount: number;
  discountPerOrder: number;
  weeklyUses: number;
  weeklyDiscountCost: number;
  weeklyBreakEvenRevenue: number;
  monthlyDiscountCost: number;
  monthlyBreakEvenRevenue: number;
  redemptionCount: number;
  actualUsesLast30Days: number;
};

export function DiscountImpactPanel({ discountId }: { discountId: string }) {
  const [weeklyUses, setWeeklyUses] = useState("50");
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [isPending, startTransition] = useTransition();

  function runEstimate() {
    startTransition(async () => {
      const result = await getDiscountImpactEstimate(
        discountId,
        Math.max(0, Number(weeklyUses) || 0)
      );
      setImpact(result as ImpactData | null);
    });
  }

  return (
    <section className="card-padded mt-8 max-w-2xl">
      <h2 className="text-base font-semibold text-servora-charcoal">Revenue impact estimator</h2>
      <p className="mt-1 text-sm text-gray-500">
        Uses your last 30 days of delivered orders for average bill size and gross margin. Adjust
        expected weekly uses to model cost and break-even sales.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Input
          label="Expected uses per week"
          type="number"
          min="0"
          value={weeklyUses}
          onChange={(event) => setWeeklyUses(event.target.value)}
          className="max-w-[180px]"
        />
        <Button type="button" variant="secondary" onClick={runEstimate} disabled={isPending}>
          {isPending ? "Calculating…" : "Estimate impact"}
        </Button>
      </div>

      {impact && (
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <Metric label="Avg order (30d)" value={formatCurrency(impact.avgOrderValue)} />
          <Metric
            label="Gross margin (30d)"
            value={`${(impact.grossMarginRate * 100).toFixed(1)}%`}
            hint={`${impact.sampleOrderCount} delivered orders sampled`}
          />
          <Metric label="Discount per use" value={formatCurrency(impact.discountPerOrder)} />
          <Metric label="Est. weekly cost" value={formatCurrency(impact.weeklyDiscountCost)} />
          <Metric
            label="Break-even extra sales / week"
            value={formatCurrency(impact.weeklyBreakEvenRevenue)}
            hint="Extra revenue needed to offset discount at current margin"
          />
          <Metric label="Est. monthly cost" value={formatCurrency(impact.monthlyDiscountCost)} />
          <Metric
            label="Actual uses (30d)"
            value={String(impact.actualUsesLast30Days)}
            hint={`${impact.redemptionCount} lifetime redemptions`}
          />
        </dl>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-servora-charcoal">{value}</dd>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
