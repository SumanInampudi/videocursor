"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicQueueTicket } from "@/lib/public-order-queue";
import { sortPublicQueueTickets } from "@/lib/public-order-queue";
import type { OrderStatus } from "@prisma/client";

type PublicQueueBoardProps = {
  businessName: string;
  tickets: PublicQueueTicket[];
  initialUpdatedAt: string;
};

const STEP_LABELS_ONLINE = ["Received", "Preparing", "Packing", "Ready"] as const;
const STEP_LABELS_DINE_IN = ["Received", "Preparing", "Ready"] as const;

const STEP_BAR_COLORS_ONLINE = [
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
] as const;

const STEP_BAR_COLORS_DINE_IN = ["bg-amber-500", "bg-sky-500", "bg-emerald-500"] as const;

const STEP_BAR_MUTED_ONLINE = [
  "bg-amber-100",
  "bg-sky-100",
  "bg-violet-100",
  "bg-emerald-100",
] as const;

const STEP_BAR_MUTED_DINE_IN = ["bg-amber-100", "bg-sky-100", "bg-emerald-100"] as const;

const STATUS_BADGE: Record<
  Exclude<OrderStatus, "DELIVERED" | "CANCELLED">,
  { label: string; className: string }
> = {
  NEW: {
    label: "Queued",
    className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  },
  PROCESSING: {
    label: "Preparing",
    className: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  },
  PACKING: {
    label: "Packing",
    className: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
  },
  READY: {
    label: "Ready",
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  },
};

function queueSubtitle(ticket: PublicQueueTicket): string | null {
  const parts: string[] = [];
  if (ticket.customerName) parts.push(ticket.customerName);
  if (ticket.tableLabel) parts.push(ticket.tableLabel);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function QueueProgressBar({
  stepIndex,
  channel,
}: {
  stepIndex: number;
  channel: PublicQueueTicket["channel"];
}) {
  const isDineIn = channel === "DINE_IN";
  const labels = isDineIn ? STEP_LABELS_DINE_IN : STEP_LABELS_ONLINE;
  const colors = isDineIn ? STEP_BAR_COLORS_DINE_IN : STEP_BAR_COLORS_ONLINE;
  const muted = isDineIn ? STEP_BAR_MUTED_DINE_IN : STEP_BAR_MUTED_ONLINE;
  const activeIndex = Math.min(stepIndex, labels.length) - 1;

  return (
    <div className="mt-3 flex gap-1.5" aria-hidden>
      {labels.map((label, i) => {
        const done = i < stepIndex;
        const current = i === activeIndex && stepIndex < labels.length;
        return (
          <div key={label} className="min-w-0 flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                done
                  ? colors[i]
                  : current
                    ? `${muted[i]} ring-1 ring-inset ring-black/10`
                    : "bg-neutral-200"
              }`}
            />
            <p
              className={`mt-0.5 truncate text-center text-[9px] font-medium uppercase tracking-wide ${
                done || current ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: PublicQueueTicket["status"] }) {
  if (status === "DELIVERED" || status === "CANCELLED") return null;
  const config = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function QueueOrderCell({ ticket }: { ticket: PublicQueueTicket }) {
  const subtitle = queueSubtitle(ticket);
  const ready = ticket.status === "READY";

  return (
    <div
      className={`border-b border-neutral-200 px-3 py-3 last:border-b-0 ${
        ready ? "bg-emerald-50/60" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tabular-nums leading-tight text-neutral-900">
            {ticket.displayTicket}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-neutral-600">{subtitle}</p>
          )}
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-neutral-500">{ticket.waitLabel}</p>
      {ticket.itemsProgressLabel &&
        ticket.itemsDone > 0 &&
        ticket.itemsDone < ticket.itemsTotal &&
        ticket.status !== "READY" && (
          <p className="mt-1 text-[11px] font-semibold text-sky-800">
            {ticket.itemsProgressLabel}
          </p>
        )}

      <QueueProgressBar stepIndex={ticket.stepIndex} channel={ticket.channel} />
    </div>
  );
}

function splitByChannel(tickets: PublicQueueTicket[]) {
  const active = tickets.filter(
    (t) =>
      t.status === "NEW" ||
      t.status === "PROCESSING" ||
      t.status === "PACKING" ||
      t.status === "READY"
  );
  const sorted = sortPublicQueueTickets(active);
  return {
    dineIn: sorted.filter((t) => t.channel === "DINE_IN"),
    online: sorted.filter((t) => t.channel === "ONLINE"),
  };
}

export function PublicQueueBoard({
  businessName,
  tickets,
  initialUpdatedAt,
}: PublicQueueBoardProps) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);

  useEffect(() => {
    const refreshId = setInterval(() => router.refresh(), 12_000);
    return () => clearInterval(refreshId);
  }, [router]);

  useEffect(() => {
    setUpdatedAt(initialUpdatedAt);
  }, [initialUpdatedAt]);

  const { dineIn, online } = useMemo(() => splitByChannel(tickets), [tickets]);
  const rowCount = Math.max(dineIn.length, online.length, 1);
  const empty = dineIn.length === 0 && online.length === 0;

  const updatedLabel = new Date(updatedAt).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-100 text-neutral-900">
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 text-center safe-area-top">
        <h1 className="text-base font-semibold tracking-tight text-neutral-900 md:text-lg">
          {businessName}
        </h1>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
          Live order queue
        </p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th
                  scope="col"
                  className="w-1/2 border-r border-neutral-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
                >
                  Dine-in
                </th>
                <th
                  scope="col"
                  className="w-1/2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
                >
                  Online
                </th>
              </tr>
            </thead>
            <tbody>
              {empty ? (
                <tr>
                  <td
                    colSpan={2}
                    className="py-12 text-center text-xs text-neutral-400"
                  >
                    No orders in progress
                  </td>
                </tr>
              ) : (
                Array.from({ length: rowCount }, (_, i) => (
                  <tr key={i} className="align-top">
                    <td className="w-1/2 border-r border-neutral-200 align-top p-0">
                      {dineIn[i] ? (
                        <QueueOrderCell ticket={dineIn[i]} />
                      ) : (
                        <div className="min-h-[4.5rem] bg-neutral-50/50" aria-hidden />
                      )}
                    </td>
                    <td className="w-1/2 align-top p-0">
                      {online[i] ? (
                        <QueueOrderCell ticket={online[i]} />
                      ) : (
                        <div className="min-h-[4.5rem] bg-neutral-50/50" aria-hidden />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <footer className="shrink-0 border-t border-neutral-200 bg-white px-4 py-1.5 text-center text-[10px] text-neutral-400 safe-area-bottom">
        Last updated {updatedLabel}
      </footer>
    </div>
  );
}
