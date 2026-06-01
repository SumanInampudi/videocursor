import { formatElapsedMs } from "@/lib/kds-timers";
import type { OrderStatus } from "@prisma/client";

export type OrderStageTimestamps = {
  status: OrderStatus;
  createdAt: Date | string;
  processedAt?: Date | string | null;
  packingAt?: Date | string | null;
  readyAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  cancelledAt?: Date | string | null;
};

export type StageDurationRow = {
  key: string;
  label: string;
  durationMs: number | null;
  durationLabel: string;
  startedAt: Date | null;
  endedAt: Date | null;
  isCurrent: boolean;
  isBottleneck: boolean;
};

function msBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  return ms >= 0 ? ms : null;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return "<1s";
  return formatElapsedMs(ms);
}

/**
 * Per-stage durations for bottleneck analysis.
 * Pipeline: NEW → PROCESSING → PACKING → READY → DELIVERED
 */
export function buildOrderStageTimeline(
  order: OrderStageTimestamps,
  now = new Date()
): {
  rows: StageDurationRow[];
  totalMs: number | null;
  totalLabel: string;
  completedMs: number | null;
} {
  const created = toDate(order.createdAt)!;
  const processed = toDate(order.processedAt);
  const packing = toDate(order.packingAt);
  const ready = toDate(order.readyAt);
  const delivered = toDate(order.deliveredAt);
  const cancelled = toDate(order.cancelledAt);

  const end = delivered ?? cancelled ?? null;
  const terminal = end ?? now;

  const currentKey =
    order.status === "NEW"
      ? "queue"
      : order.status === "PROCESSING"
        ? "processing"
        : order.status === "PACKING"
          ? "packing"
          : order.status === "READY"
            ? "ready"
            : null;

  const stageDefs: {
    key: string;
    label: string;
    start: Date | null;
    end: Date | null;
    skipIfNoStart?: boolean;
  }[] = [
    {
      key: "queue",
      label: "Queued (received → start)",
      start: created,
      end: processed,
    },
    {
      key: "processing",
      label: "Preparing (kitchen)",
      start: processed,
      end: packing,
      skipIfNoStart: true,
    },
    {
      key: "packing",
      label: "Packing",
      start: packing,
      end: ready,
      skipIfNoStart: true,
    },
    {
      key: "ready",
      label: "Ready (awaiting pickup)",
      start: ready,
      end: delivered,
      skipIfNoStart: true,
    },
  ];

  const rows: StageDurationRow[] = [];

  for (const def of stageDefs) {
    if (def.skipIfNoStart && !def.start) continue;

    let durationMs: number | null = null;
    let endedAt = def.end;

    if (def.end) {
      durationMs = msBetween(def.start, def.end);
    } else if (currentKey === def.key && def.start) {
      durationMs = msBetween(def.start, terminal);
      endedAt = null;
    } else if (def.key === "queue" && !processed && currentKey === "queue") {
      durationMs = msBetween(created, terminal);
      endedAt = null;
    }

    rows.push({
      key: def.key,
      label: def.label,
      durationMs,
      durationLabel: formatDuration(durationMs),
      startedAt: def.start,
      endedAt,
      isCurrent: currentKey === def.key,
      isBottleneck: false,
    });
  }

  const completedMs = msBetween(created, delivered ?? cancelled ?? null);
  const totalMs =
    delivered || cancelled ? completedMs : msBetween(created, terminal);

  const numericDurations = rows
    .map((r) => r.durationMs)
    .filter((m): m is number => m != null && m > 0);

  if (numericDurations.length > 1) {
    const max = Math.max(...numericDurations);
    for (const row of rows) {
      if (row.durationMs != null && row.durationMs === max && row.durationMs >= 60_000) {
        row.isBottleneck = true;
      }
    }
  }

  return {
    rows,
    totalMs,
    totalLabel: formatDuration(totalMs),
    completedMs,
  };
}
