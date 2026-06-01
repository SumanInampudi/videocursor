"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { supplierSchema } from "@/lib/validations";

const PATHS = ["/suppliers", "/inventory", "/inventory/purchases/new", "/"];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export async function getSuppliers(activeOnly = false) {
  const rows = await db.supplier.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
  return serializeForClient(rows);
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

  await db.supplier.create({ data: parsed.data });
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
  return getSuppliers(true);
}
