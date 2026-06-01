export const VENUE_SETTING_KEYS = {
  enableDineIn: "pos_enable_dine_in",
  enableOnline: "pos_enable_online",
  requireTableDineIn: "pos_require_table_dine_in",
  defaultChannel: "pos_default_channel",
  dineInPaymentTiming: "pos_dine_in_payment_timing",
} as const;

export type DineInPaymentTiming = "upfront" | "at_close";

export type VenuePosSettings = {
  enableDineIn: boolean;
  enableOnline: boolean;
  requireTableDineIn: boolean;
  defaultChannel: "DINE_IN" | "ONLINE";
  dineInPaymentTiming: DineInPaymentTiming;
};

export const DEFAULT_VENUE_SETTINGS: VenuePosSettings = {
  enableDineIn: true,
  enableOnline: true,
  requireTableDineIn: true,
  defaultChannel: "DINE_IN",
  dineInPaymentTiming: "at_close",
};

export function parseVenueSettings(
  rows: { key: string; value: string }[]
): VenuePosSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const channel = map.get(VENUE_SETTING_KEYS.defaultChannel);
  const timing = map.get(VENUE_SETTING_KEYS.dineInPaymentTiming);
  return {
    enableDineIn: map.get(VENUE_SETTING_KEYS.enableDineIn) !== "false",
    enableOnline: map.get(VENUE_SETTING_KEYS.enableOnline) !== "false",
    requireTableDineIn: map.get(VENUE_SETTING_KEYS.requireTableDineIn) === "true",
    defaultChannel: channel === "ONLINE" ? "ONLINE" : "DINE_IN",
    dineInPaymentTiming: timing === "upfront" ? "upfront" : "at_close",
  };
}

export function isPayAtClose(venue: VenuePosSettings, channel: "DINE_IN" | "ONLINE"): boolean {
  return channel === "DINE_IN" && venue.dineInPaymentTiming === "at_close";
}
