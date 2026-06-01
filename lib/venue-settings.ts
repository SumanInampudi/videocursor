export const VENUE_SETTING_KEYS = {
  enableDineIn: "pos_enable_dine_in",
  enableOnline: "pos_enable_online",
  requireTableDineIn: "pos_require_table_dine_in",
  defaultChannel: "pos_default_channel",
} as const;

export type VenuePosSettings = {
  enableDineIn: boolean;
  enableOnline: boolean;
  requireTableDineIn: boolean;
  defaultChannel: "DINE_IN" | "ONLINE";
};

export const DEFAULT_VENUE_SETTINGS: VenuePosSettings = {
  enableDineIn: true,
  enableOnline: true,
  requireTableDineIn: true,
  defaultChannel: "DINE_IN",
};

export function parseVenueSettings(
  rows: { key: string; value: string }[]
): VenuePosSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const channel = map.get(VENUE_SETTING_KEYS.defaultChannel);
  return {
    enableDineIn: map.get(VENUE_SETTING_KEYS.enableDineIn) !== "false",
    enableOnline: map.get(VENUE_SETTING_KEYS.enableOnline) !== "false",
    requireTableDineIn: map.get(VENUE_SETTING_KEYS.requireTableDineIn) === "true",
    defaultChannel: channel === "ONLINE" ? "ONLINE" : "DINE_IN",
  };
}
