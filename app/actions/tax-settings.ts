"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/auth";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import {
  DEFAULT_TAX_SETTINGS,
  parseTaxSettings,
  TAX_SETTING_KEY,
  taxSettingsToJson,
  type TaxSettings,
} from "@/lib/tax-settings";

const REVALIDATE = ["/orders/pos", "/orders/pos/settings", "/orders"];

function revalidateTax() {
  for (const p of REVALIDATE) revalidatePath(p);
}

export async function getTaxSettings(): Promise<TaxSettings> {
  const { businessId } = await requireBusinessContext();
  const row = await db.appSetting.findUnique({
    where: { businessId_key: { businessId, key: TAX_SETTING_KEY } },
  });
  return parseTaxSettings(row?.value);
}

export async function getTaxSettingsForBusiness(businessId: string): Promise<TaxSettings> {
  const row = await db.appSetting.findUnique({
    where: { businessId_key: { businessId, key: TAX_SETTING_KEY } },
  });
  return parseTaxSettings(row?.value);
}

export async function saveTaxSettings(settings: TaxSettings) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  const normalized: TaxSettings = {
    ...settings,
    gstRatePercent: Math.max(0, Math.min(100, Number(settings.gstRatePercent) || 0)),
    gstin: settings.gstin.trim().toUpperCase(),
    legalName: settings.legalName.trim(),
    address: settings.address.trim(),
  };

  await db.appSetting.upsert({
    where: { businessId_key: { businessId, key: TAX_SETTING_KEY } },
    create: { businessId, key: TAX_SETTING_KEY, value: taxSettingsToJson(normalized) },
    update: { value: taxSettingsToJson(normalized) },
  });

  revalidateTax();
  return { success: true };
}

export async function getTaxSettingsSerialized() {
  return serializeForClient(await getTaxSettings());
}
