"use client";

import {
  TIMER_BADGE_CLASS,
  elapsedMinutes,
  formatElapsedMs,
  getTimerSeverity,
  type KdsThresholds,
} from "@/lib/kds-timers";
import { useElapsed } from "@/lib/hooks/useElapsed";

type OrderTimerBadgeProps = {
  since: Date | string;
  thresholds: KdsThresholds;
  estimatedPrepMinutes?: number | null;
  label?: string;
};

export function OrderTimerBadge({
  since,
  thresholds,
  estimatedPrepMinutes,
  label = "Step",
}: OrderTimerBadgeProps) {
  const elapsedMs = useElapsed(since);
  const mins = elapsedMinutes(elapsedMs);
  const severity = getTimerSeverity(mins, thresholds, estimatedPrepMinutes);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${TIMER_BADGE_CLASS[severity]}`}
      title={`${label} time`}
    >
      <span className="opacity-70">{label}</span>
      {formatElapsedMs(elapsedMs)}
    </span>
  );
}
