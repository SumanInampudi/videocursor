"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/units";

const TIP_PRESETS = [
  { id: "0", label: "No tip", percent: 0 },
  { id: "10", label: "10%", percent: 10 },
  { id: "15", label: "15%", percent: 15 },
  { id: "custom", label: "Custom", percent: null as number | null },
] as const;

type TipSelectorProps = {
  netBeforeTip: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
  disabled?: boolean;
};

export function TipSelector({
  netBeforeTip,
  tipAmount,
  onTipChange,
  disabled,
}: TipSelectorProps) {
  const [preset, setPreset] = useState<string>(() => {
    if (tipAmount <= 0) return "0";
    const pct = netBeforeTip > 0 ? (tipAmount / netBeforeTip) * 100 : 0;
    if (Math.abs(pct - 10) < 0.05) return "10";
    if (Math.abs(pct - 15) < 0.05) return "15";
    return "custom";
  });
  const [custom, setCustom] = useState(
    preset === "custom" && tipAmount > 0 ? String(tipAmount) : ""
  );

  function applyPreset(id: string) {
    setPreset(id);
    const p = TIP_PRESETS.find((x) => x.id === id);
    if (!p || p.percent == null) {
      if (id === "custom") return;
      onTipChange(0);
      setCustom("");
      return;
    }
    const amount = Math.round(netBeforeTip * (p.percent / 100) * 100) / 100;
    onTipChange(amount);
    setCustom("");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-servora-charcoal">Tip (optional)</p>
      <div className="flex flex-wrap gap-2">
        {TIP_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              preset === p.id
                ? "border-servora-yellow bg-yellow-50 text-servora-charcoal"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">₹</span>
          <input
            type="number"
            min={0}
            step={1}
            disabled={disabled}
            value={custom}
            onChange={(e) => {
              const v = e.target.value;
              setCustom(v);
              const n = parseFloat(v);
              onTipChange(Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0);
            }}
            className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            placeholder="Amount"
          />
        </div>
      )}
      {tipAmount > 0 && (
        <p className="text-xs text-gray-500">Tip: {formatCurrency(tipAmount)}</p>
      )}
    </div>
  );
}
