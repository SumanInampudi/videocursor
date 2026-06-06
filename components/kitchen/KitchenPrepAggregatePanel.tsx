"use client";

import { useMemo, useState } from "react";
import {
  buildKitchenPrepAggregate,
  type KitchenPrepAggregateInputOrder,
} from "@/lib/kitchen-kds";
import { orderTicketLabel } from "@/lib/order-channel";
import type { OrderChannel } from "@prisma/client";

type KitchenPrepOrder = KitchenPrepAggregateInputOrder & {
  channel: OrderChannel;
  tableLabel: string | null;
  externalRef: string | null;
  customerName: string | null;
};

type KitchenPrepAggregatePanelProps = {
  orders: KitchenPrepOrder[];
};

export function KitchenPrepAggregatePanel({ orders }: KitchenPrepAggregatePanelProps) {
  const rows = useMemo(() => buildKitchenPrepAggregate(orders), [orders]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const ticketLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const order of orders) {
      labels.set(order.id, orderTicketLabel(order));
    }
    return labels;
  }, [orders]);

  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-servora-charcoal">
          Make now
        </h2>
        <p className="mt-1 text-xs text-gray-500">No pending kitchen items in New or Cooking.</p>
      </section>
    );
  }

  const totalPending = rows.reduce((sum, row) => sum + row.pendingQty, 0);

  return (
    <section className="rounded-lg border border-servora-charcoal/15 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-servora-charcoal">
            Make now
          </h2>
          <p className="text-[11px] text-gray-500">
            Totals across New + Cooking · pending qty only · tap a row for tickets
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-servora-charcoal px-2.5 py-1 text-xs font-bold tabular-nums text-white">
          {totalPending} item{totalPending === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="divide-y divide-gray-100">
        {rows.map((row) => {
          const expanded = expandedKey === row.key;
          return (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => setExpandedKey(expanded ? null : row.key)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                aria-expanded={expanded}
              >
                <span className="min-w-[2.5rem] shrink-0 text-2xl font-bold tabular-nums text-servora-charcoal">
                  {row.pendingQty}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {row.productName}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {row.tickets.length} ticket{row.tickets.length === 1 ? "" : "s"}
                  </span>
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {expanded && (
                <ul className="border-t border-gray-50 bg-gray-50/80 px-4 py-2">
                  {row.tickets.map((ticket) => (
                    <li
                      key={ticket.orderId}
                      className="flex items-center justify-between gap-2 py-1 text-xs text-gray-700"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {ticketLabels.get(ticket.orderId) ?? ticket.orderNumber}
                      </span>
                      <span className="shrink-0 tabular-nums text-gray-500">
                        {ticket.orderNumber} ·{" "}
                        {ticket.status === "NEW"
                          ? "New"
                          : ticket.status === "PROCESSING"
                            ? "Cooking"
                            : ticket.status}{" "}
                        · ×
                        {ticket.pendingQty}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
