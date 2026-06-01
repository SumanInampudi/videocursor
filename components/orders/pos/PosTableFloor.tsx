"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getPosTableFloor } from "@/app/actions/table-service";
import { formatCurrency } from "@/lib/units";
import type { OrderStatus } from "@prisma/client";

type FloorTable = {
  table: {
    id: string;
    code: string;
    label: string;
    section: string | null;
  };
  state: "free" | "open";
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    customerName: string | null;
    covers: number | null;
    total: number;
    lineCount: number;
  } | null;
};

type PosTableFloorProps = {
  onSelectFreeTable: (tableId: string, label: string) => void;
  onResumeOrder: (orderId: string, tableId: string, orderNumber: string) => void;
  onSettleOrder: (orderId: string, orderNumber: string, total: number) => void;
};

export function PosTableFloor({
  onSelectFreeTable,
  onResumeOrder,
  onSettleOrder,
}: PosTableFloorProps) {
  const [floor, setFloor] = useState<FloorTable[]>([]);
  const [unassigned, setUnassigned] = useState<
    { id: string; orderNumber: string; total: number; tableLabel: string | null }[]
  >([]);
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const data = await getPosTableFloor();
      setFloor(data.floor as FloorTable[]);
      setUnassigned(data.unassigned as typeof unassigned);
    });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  const sections = [...new Set(floor.map((f) => f.table.section || "Main"))];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        <p className="text-xs text-gray-500">
          Tap a free table to start · open table to add items or settle
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-wide text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-gray-300 bg-white" /> Free
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Open bill
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section} className="mb-4">
            {sections.length > 1 && (
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">{section}</p>
            )}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {floor
                .filter((f) => (f.table.section || "Main") === section)
                .map((item) => {
                  const open = item.state === "open" && item.order;
                  return (
                    <div
                      key={item.table.id}
                      className={`flex min-h-[88px] flex-col rounded-xl border-2 p-2 ${
                        open
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <span className="text-lg font-bold text-servora-charcoal">
                        {item.table.code}
                      </span>
                      {open ? (
                        <>
                          <span className="text-[10px] font-medium text-amber-900">
                            {item.order!.orderNumber}
                          </span>
                          <span className="mt-auto text-xs font-semibold tabular-nums">
                            {formatCurrency(item.order!.total)}
                          </span>
                          <div className="mt-1 grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              className="rounded-md bg-servora-yellow py-1 text-[10px] font-bold text-white"
                              onClick={() =>
                                onResumeOrder(
                                  item.order!.id,
                                  item.table.id,
                                  item.order!.orderNumber
                                )
                              }
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-gray-300 bg-white py-1 text-[10px] font-semibold"
                              onClick={() =>
                                onSettleOrder(
                                  item.order!.id,
                                  item.order!.orderNumber,
                                  item.order!.total
                                )
                              }
                            >
                              Pay
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="mt-auto w-full rounded-md border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-600 hover:border-servora-yellow"
                          onClick={() =>
                            onSelectFreeTable(item.table.id, item.table.label)
                          }
                        >
                          Open
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Open bills (no table)</p>
            <ul className="mt-2 space-y-2">
              {unassigned.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {o.orderNumber}
                    {o.tableLabel ? ` · ${o.tableLabel}` : ""}
                  </span>
                  <span className="font-semibold">{formatCurrency(o.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
