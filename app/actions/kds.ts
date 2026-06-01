"use server";

import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { DEFAULT_KDS_THRESHOLDS, type KdsThresholds } from "@/lib/kds-timers";

const KDS_KEYS = {
  warnMinutes: "kds_warn_minutes",
  overdueMinutes: "kds_overdue_minutes",
} as const;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function getKdsThresholds(): Promise<KdsThresholds> {
  const { businessId } = await requireBusinessContext();
  const rows = await db.appSetting.findMany({
    where: {
      businessId,
      key: { in: Object.values(KDS_KEYS) },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const warnMinutes = parsePositiveInt(
    map.get(KDS_KEYS.warnMinutes),
    DEFAULT_KDS_THRESHOLDS.warnMinutes
  );
  let overdueMinutes = parsePositiveInt(
    map.get(KDS_KEYS.overdueMinutes),
    DEFAULT_KDS_THRESHOLDS.overdueMinutes
  );
  if (overdueMinutes <= warnMinutes) {
    overdueMinutes = warnMinutes + 5;
  }

  return { warnMinutes, overdueMinutes };
}
