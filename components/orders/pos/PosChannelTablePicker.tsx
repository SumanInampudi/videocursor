"use client";

import type { OrderChannel } from "@prisma/client";
import type { VenuePosSettings } from "@/lib/venue-settings";

export type DiningTableOption = {
  id: string;
  code: string;
  label: string;
  section: string | null;
};

type PosChannelTablePickerProps = {
  venue: VenuePosSettings;
  tables: DiningTableOption[];
  channel: OrderChannel;
  diningTableId: string;
  externalRef: string;
  onChannelChange: (channel: OrderChannel) => void;
  onTableChange: (tableId: string) => void;
  onExternalRefChange: (ref: string) => void;
};

export function PosChannelTablePicker({
  venue,
  tables,
  channel,
  diningTableId,
  externalRef,
  onChannelChange,
  onTableChange,
  onExternalRefChange,
}: PosChannelTablePickerProps) {
  const sections = [...new Set(tables.map((t) => t.section || "Main"))];

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Order type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {venue.enableDineIn && (
            <button
              type="button"
              onClick={() => onChannelChange("DINE_IN")}
              className={`touch-target rounded-lg border-2 px-3 py-3 text-sm font-semibold ${
                channel === "DINE_IN"
                  ? "border-servora-yellow bg-yellow-50 text-servora-charcoal"
                  : "border-gray-200 bg-surface-card text-gray-700"
              }`}
            >
              Dine-in
            </button>
          )}
          {venue.enableOnline && (
            <button
              type="button"
              onClick={() => onChannelChange("ONLINE")}
              className={`touch-target rounded-lg border-2 px-3 py-3 text-sm font-semibold ${
                channel === "ONLINE"
                  ? "border-servora-yellow bg-yellow-50 text-servora-charcoal"
                  : "border-gray-200 bg-surface-card text-gray-700"
              }`}
            >
              Online
            </button>
          )}
        </div>
      </div>

      {channel === "DINE_IN" && venue.requireTableDineIn && tables.length === 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No tables set up. Add tables under Register → Settings, or disable “Require table for
          dine-in” there.
        </p>
      )}

      {channel === "DINE_IN" && tables.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">
            Table {venue.requireTableDineIn && <span className="text-servora-red">*</span>}
          </p>
          {sections.map((section) => (
            <div key={section} className="mb-2">
              {sections.length > 1 && (
                <p className="mb-1 text-[10px] font-medium uppercase text-gray-400">{section}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {tables
                  .filter((t) => (t.section || "Main") === section)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onTableChange(t.id)}
                      className={`min-w-[3rem] rounded-md border px-2.5 py-2 text-sm font-bold ${
                        diningTableId === t.id
                          ? "border-servora-yellow bg-servora-yellow text-white"
                          : "border-gray-200 bg-surface-card text-servora-charcoal"
                      }`}
                    >
                      {t.code}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {channel === "ONLINE" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Online reference (optional)
          </label>
          <input
            type="text"
            value={externalRef}
            onChange={(e) => onExternalRefChange(e.target.value)}
            placeholder="Aggregator #, phone, name…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
