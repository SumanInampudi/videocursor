"use client";

import { formatPrepDuration } from "@/lib/order-prep-time";
import { elapsedMinutes, getTimerSeverity, type KdsThresholds } from "@/lib/kds-timers";
import { useElapsed } from "@/lib/hooks/useElapsed";

type KitchenPrepHintProps = {
  stageSince: Date | string;
  totalSince: Date | string;
  estimatedPrepMinutes: number | null;
  thresholds: KdsThresholds;
};

export function KitchenPrepHint({
  stageSince,
  totalSince,
  estimatedPrepMinutes,
  thresholds,
}: KitchenPrepHintProps) {
  const stageMs = useElapsed(stageSince);
  const totalMs = useElapsed(totalSince);
  const stageMin = elapsedMinutes(stageMs);
  const severity = getTimerSeverity(stageMin, thresholds, estimatedPrepMinutes);

  if (estimatedPrepMinutes == null) {
    return (
      <p className="text-[10px] text-gray-500">
        Total {formatPrepDuration(Math.ceil(elapsedMinutes(totalMs)))}
      </p>
    );
  }

  const remaining = Math.max(0, Math.ceil(estimatedPrepMinutes - stageMin));
  const overdue = stageMin > estimatedPrepMinutes;

  return (
    <p
      className={`text-[10px] font-medium ${
        severity === "overdue"
          ? "text-red-700"
          : severity === "warn"
            ? "text-amber-800"
            : "text-gray-600"
      }`}
    >
      Est. {formatPrepDuration(estimatedPrepMinutes)}
      {overdue ? ` · ${formatPrepDuration(Math.ceil(stageMin - estimatedPrepMinutes))} over` : ` · ~${remaining}m left`}
      {" · "}
      <span className="font-normal text-gray-500">
        {formatPrepDuration(Math.ceil(elapsedMinutes(totalMs)))} total
      </span>
    </p>
  );
}
