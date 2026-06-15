"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { smartMatches } from "@/lib/smart-search";
import { supplierSchema } from "@/lib/validations";

const PATHS = ["/suppliers", "/inventory", "/inventory/receive", "/"];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export async function getSuppliers(
  options: boolean | { activeOnly?: boolean; search?: string } = false
) {
  const activeOnly = typeof options === "boolean" ? options : options.activeOnly ?? false;
  const search = typeof options === "boolean" ? undefined : options.search;
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const rows = await db.supplier.findMany({
    where: {
      businessId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
  if (!search?.trim()) return serializeForClient(rows);
  return serializeForClient(
    rows.filter((row) => smartMatches([row.name, row.contactPhone, row.email, row.address], search))
  );
}

export async function getSupplier(id: string) {
  const row = await db.supplier.findUnique({ where: { id } });
  return row ? serializeForClient(row) : null;
}

export async function createSupplier(formData: FormData) {
  const parsed = supplierSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  await db.supplier.create({ data: { ...parsed.data, businessId } });
  revalidate();
  return { success: true };
}

export async function updateSupplier(id: string, formData: FormData) {
  const parsed = supplierSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  await db.supplier.update({ where: { id }, data: parsed.data });
  revalidate();
  return { success: true };
}

export async function getSupplierOptions() {
  return getSuppliers({ activeOnly: true });
}
