"use client";

import {
  estimateOrderPrepMinutes,
  formatPrepDuration,
  formatReadyByTime,
} from "@/lib/order-prep-time";

type OrderPrepEstimateProps = {
  lines: { productId: string; quantity: number }[];
  products: { id: string; prepTimeMinutes?: number | null }[];
  variant?: "banner" | "inline";
};

export function OrderPrepEstimate({ lines, products, variant = "banner" }: OrderPrepEstimateProps) {
  const productMap = new Map(products.map((r) => [r.id, r.prepTimeMinutes]));
  const minutes = estimateOrderPrepMinutes(
    lines.map((l) => ({
      quantity: l.quantity,
      prepTimeMinutes: productMap.get(l.productId) ?? null,
    }))
  );

  if (minutes == null || lines.length === 0) {
    if (variant === "inline") return null;
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Set <strong>Prep time (min)</strong> on{" "}
        <a href="/products/pricing" className="link-brand">
          product pricing
        </a>{" "}
        for kitchen ETA at checkout.
      </p>
    );
  }

  const text = `Est. ready ~${formatPrepDuration(minutes)} · by ${formatReadyByTime(minutes)}`;

  if (variant === "inline") {
    return <span className="text-xs font-medium text-servora-charcoal">{text}</span>;
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
      <span className="font-semibold">Kitchen estimate:</span> {text}
    </div>
  );
}
