"use client";

import { useState, useTransition } from "react";
import { saveTaxSettings } from "@/app/actions/tax-settings";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { GST_RATE_OPTIONS, type TaxSettings } from "@/lib/tax-settings";

type TaxSettingsFormProps = {
  initial: TaxSettings;
};

export function TaxSettingsForm({ initial }: TaxSettingsFormProps) {
  const { success, error: toastError } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<TaxSettings>(initial);

  function update<K extends keyof TaxSettings>(key: K, value: TaxSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveTaxSettings(form);
      if (result.success) success("Tax settings saved");
      else toastError("Could not save tax settings");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-gray-200 bg-white p-4 space-y-4"
    >
      <div>
        <h2 className="font-semibold text-servora-charcoal">GST & tax (India)</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rates apply to new payments only. Paid orders keep the tax snapshot from checkout.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
        />
        Charge GST on orders
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.pricesIncludeTax}
          onChange={(e) => update("pricesIncludeTax", e.target.checked)}
          disabled={!form.enabled}
        />
        Menu prices include GST (tax inclusive)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            GST rate (%)
          </label>
          <select
            value={form.gstRatePercent}
            disabled={!form.enabled}
            onChange={(e) => update("gstRatePercent", Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {GST_RATE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Supply type
          </label>
          <select
            value={form.supplyType}
            disabled={!form.enabled}
            onChange={(e) =>
              update("supplyType", e.target.value as TaxSettings["supplyType"])
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="INTRA_STATE">Intra-state (CGST + SGST)</option>
            <option value="INTER_STATE">Inter-state (IGST)</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Legal name (on receipt)
          </label>
          <input
            type="text"
            value={form.legalName}
            onChange={(e) => update("legalName", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Registered business name"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">GSTIN</label>
          <input
            type="text"
            value={form.gstin}
            onChange={(e) => update("gstin", e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address (optional, for printed receipt)
        </label>
        <textarea
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save tax settings"}
      </Button>
    </form>
  );
}
