"use client";

import { useState, useTransition } from "react";
import { saveVenuePosSettings } from "@/app/actions/venue";
import { Button } from "@/components/ui/Button";
import type { VenuePosSettings } from "@/lib/venue-settings";

export function VenueSettingsForm({ initial }: { initial: VenuePosSettings }) {
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await saveVenuePosSettings(settings);
      setMessage("Venue settings saved");
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-servora-charcoal">POS order types</h2>
      <p className="mt-1 text-sm text-gray-500">
        Control dine-in tables and online orders on the register.
      </p>
      <div className="mt-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enableDineIn}
            onChange={(e) => setSettings((s) => ({ ...s, enableDineIn: e.target.checked }))}
          />
          Enable dine-in
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enableOnline}
            onChange={(e) => setSettings((s) => ({ ...s, enableOnline: e.target.checked }))}
          />
          Enable online / takeaway
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.requireTableDineIn}
            onChange={(e) =>
              setSettings((s) => ({ ...s, requireTableDineIn: e.target.checked }))
            }
          />
          Require table for dine-in
        </label>
        <div>
          <label className="text-sm font-medium">Dine-in payment</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={settings.dineInPaymentTiming}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                dineInPaymentTiming: e.target.value as "upfront" | "at_close",
              }))
            }
          >
            <option value="at_close">Pay at close (table tabs)</option>
            <option value="upfront">Pay upfront at register</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Pay at close lets staff send orders to the kitchen and settle the bill when guests
            leave. Online orders always pay upfront.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Default order type</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={settings.defaultChannel}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                defaultChannel: e.target.value as "DINE_IN" | "ONLINE",
              }))
            }
          >
            <option value="DINE_IN">Dine-in</option>
            <option value="ONLINE">Online</option>
          </select>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      <Button type="button" className="mt-4" onClick={save} disabled={isPending}>
        {isPending ? "Saving…" : "Save venue settings"}
      </Button>
    </div>
  );
}
