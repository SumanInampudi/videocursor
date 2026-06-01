/** Indian GST configuration (stored in app_settings, not on orders). */

export const TAX_SETTING_KEY = "order_tax_config";

export type TaxSupplyType = "INTRA_STATE" | "INTER_STATE";

export type TaxSettings = {
  enabled: boolean;
  /** Menu prices already include GST. */
  pricesIncludeTax: boolean;
  /** Total GST % (e.g. 5 for restaurant 5%, 18 for standard). */
  gstRatePercent: number;
  supplyType: TaxSupplyType;
  legalName: string;
  gstin: string;
  address: string;
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  pricesIncludeTax: true,
  gstRatePercent: 5,
  supplyType: "INTRA_STATE",
  legalName: "",
  gstin: "",
  address: "",
};

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;

export function parseTaxSettings(raw: string | undefined | null): TaxSettings {
  if (!raw?.trim()) return { ...DEFAULT_TAX_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<TaxSettings>;
    const rate = Number(parsed.gstRatePercent);
    return {
      enabled: parsed.enabled !== false,
      pricesIncludeTax: parsed.pricesIncludeTax !== false,
      gstRatePercent: Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_TAX_SETTINGS.gstRatePercent,
      supplyType:
        parsed.supplyType === "INTER_STATE" ? "INTER_STATE" : "INTRA_STATE",
      legalName: String(parsed.legalName ?? "").trim(),
      gstin: String(parsed.gstin ?? "").trim().toUpperCase(),
      address: String(parsed.address ?? "").trim(),
    };
  } catch {
    return { ...DEFAULT_TAX_SETTINGS };
  }
}

export function taxSettingsToJson(settings: TaxSettings): string {
  return JSON.stringify(settings);
}
