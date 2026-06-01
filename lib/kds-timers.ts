import type { OrderStatus } from "@prisma/client";

export type KdsThresholds = {
  warnMinutes: number;
  overdueMinutes: number;
};

export const DEFAULT_KDS_THRESHOLDS: KdsThresholds = {
  warnMinutes: 8,
  overdueMinutes: 15,
};

export type TimerSeverity = "ok" | "warn" | "overdue";

type OrderTimestamps = {
  status: OrderStatus;
  createdAt: Date | string;
  processedAt?: Date | string | null;
  packingAt?: Date | string | null;
  readyAt?: Date | string | null;
};

export function getStageAnchor(order: OrderTimestamps): Date {
  const created = new Date(order.createdAt);
  if (order.status === "PROCESSING" && order.processedAt) {
    return new Date(order.processedAt);
  }
  if (order.status === "PACKING" && order.packingAt) {
    return new Date(order.packingAt);
  }
  if (order.status === "READY" && order.readyAt) {
    return new Date(order.readyAt);
  }
  return created;
}

export function getTotalAnchor(order: Pick<OrderTimestamps, "createdAt">): Date {
  return new Date(order.createdAt);
}

export function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function elapsedMinutes(ms: number): number {
  return ms / 60_000;
}

export function getTimerSeverity(
  stageElapsedMinutes: number,
  thresholds: KdsThresholds,
  estimatedPrepMinutes?: number | null
): TimerSeverity {
  if (estimatedPrepMinutes != null && estimatedPrepMinutes > 0) {
    if (stageElapsedMinutes >= estimatedPrepMinutes * 1.15) return "overdue";
    if (stageElapsedMinutes >= estimatedPrepMinutes * 0.85) return "warn";
    return "ok";
  }
  if (stageElapsedMinutes >= thresholds.overdueMinutes) return "overdue";
  if (stageElapsedMinutes >= thresholds.warnMinutes) return "warn";
  return "ok";
}

export const TIMER_BADGE_CLASS: Record<TimerSeverity, string> = {
  ok: "bg-green-100 text-green-800 ring-green-200",
  warn: "bg-amber-100 text-amber-900 ring-amber-200",
  overdue: "bg-red-100 text-red-800 ring-red-200 animate-pulse",
};
