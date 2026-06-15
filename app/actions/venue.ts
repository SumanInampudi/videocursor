"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/auth";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import {
  DEFAULT_VENUE_SETTINGS,
  parseVenueSettings,
  VENUE_SETTING_KEYS,
  type VenuePosSettings,
} from "@/lib/venue-settings";
import { OrderChannel } from "@prisma/client";

const REVALIDATE = ["/orders/pos", "/orders/pos/settings", "/orders/kitchen"];

function revalidateVenue() {
  for (const p of REVALIDATE) revalidatePath(p);
}

async function upsertSetting(businessId: string, key: string, value: string) {
  await db.appSetting.upsert({
    where: { businessId_key: { businessId, key } },
    create: { businessId, key, value },
    update: { value },
  });
}

export async function getVenuePosSettings() {
  const { businessId } = await requireBusinessContext();
  const rows = await db.appSetting.findMany({
    where: {
      businessId,
      key: { in: Object.values(VENUE_SETTING_KEYS) },
    },
  });
  return parseVenueSettings(rows);
}

export async function saveVenuePosSettings(settings: VenuePosSettings) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  await upsertSetting(
    businessId,
    VENUE_SETTING_KEYS.enableDineIn,
    String(settings.enableDineIn)
  );
  await upsertSetting(
    businessId,
    VENUE_SETTING_KEYS.enableOnline,
    String(settings.enableOnline)
  );
  await upsertSetting(
    businessId,
    VENUE_SETTING_KEYS.requireTableDineIn,
    String(settings.requireTableDineIn)
  );
  await upsertSetting(
    businessId,
    VENUE_SETTING_KEYS.defaultChannel,
    settings.defaultChannel
  );
  await upsertSetting(
    businessId,
    VENUE_SETTING_KEYS.dineInPaymentTiming,
    settings.dineInPaymentTiming
  );

  revalidateVenue();
  return { success: true };
}

export async function getDiningTables() {
  const { businessId } = await requireBusinessContext();
  const tables = await db.diningTable.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
  });
  return serializeForClient(tables);
}

export async function getDiningTablesForAdmin() {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();
  const tables = await db.diningTable.findMany({
    where: { businessId },
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
  });
  return serializeForClient(tables);
}

export async function getPosRegisterData() {
  const { businessId } = await requireBusinessContext();
  const [settingsRows, tables] = await Promise.all([
    db.appSetting.findMany({
      where: {
        businessId,
        key: { in: Object.values(VENUE_SETTING_KEYS) },
      },
    }),
    db.diningTable.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
    }),
  ]);

  const settings = parseVenueSettings(settingsRows);
  return serializeForClient({
    venue: settings,
    tables,
  });
}

export async function upsertDiningTable(formData: FormData) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  const id = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || `Table ${code}`;
  const section = String(formData.get("section") ?? "").trim() || null;
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0;
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? parseInt(capacityRaw, 10) : null;
  const isActive = formData.get("isActive") !== "false";

  if (!code) {
    return { error: "Table code is required" };
  }

  if (id) {
    await db.diningTable.update({
      where: { id },
      data: { code, label, section, sortOrder, capacity, isActive },
    });
  } else {
    await db.diningTable.create({
      data: {
        businessId,
        code,
        label,
        section,
        sortOrder,
        capacity,
        isActive,
      },
    });
  }

  revalidateVenue();
  revalidatePath("/orders/pos/settings");
  return { success: true };
}

export async function deleteDiningTable(id: string) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();
  await db.diningTable.update({
    where: { id, businessId },
    data: { isActive: false },
  });
  revalidateVenue();
  return { success: true };
}
