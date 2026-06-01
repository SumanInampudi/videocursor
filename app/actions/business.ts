"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/auth";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function getBusinesses() {
  await requireAdminSession();
  return db.business.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getActiveBusiness() {
  const ctx = await requireBusinessContext();
  const business = await db.business.findUnique({
    where: { id: ctx.businessId },
  });
  return business ? serializeForClient(business) : null;
}

export async function createBusiness(formData: FormData) {
  await requireAdminSession();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);
  const timezone = String(formData.get("timezone") ?? "Asia/Kolkata").trim();
  const currency = String(formData.get("currency") ?? "INR").trim().toUpperCase();

  if (!name) {
    return { error: "Business name is required" };
  }

  const existing = await db.business.findUnique({ where: { slug } });
  if (existing) {
    return { error: "Slug already in use" };
  }

  const business = await db.business.create({
    data: { name, slug, timezone, currency },
  });

  const tableCodes = ["1", "2", "3", "4", "5", "6", "7", "8"];
  await db.diningTable.createMany({
    data: tableCodes.map((code, i) => ({
      businessId: business.id,
      code,
      label: `Table ${code}`,
      section: "Main",
      sortOrder: i + 1,
    })),
  });

  const keys = [
    ["pos_enable_dine_in", "true"],
    ["pos_enable_online", "true"],
    ["pos_require_table_dine_in", "true"],
    ["pos_default_channel", "DINE_IN"],
  ] as const;
  for (const [key, value] of keys) {
    await db.appSetting.create({
      data: { businessId: business.id, key, value },
    });
  }

  revalidatePath("/admin/business");
  return { success: true, businessId: business.id };
}
