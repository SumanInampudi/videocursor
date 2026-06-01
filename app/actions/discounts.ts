"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { calculateDiscountAmount, isDiscountValid } from "@/lib/discount-calc";
import { serializeForClient } from "@/lib/serialize";
import { discountSchema } from "@/lib/validations";

const PATHS = ["/discounts", "/orders/new", "/"];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export async function getDiscounts(activeOnly = false) {
  const rows = await db.discount.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { code: "asc" },
  });
  return serializeForClient(rows);
}

export async function getDiscount(id: string) {
  const row = await db.discount.findUnique({ where: { id } });
  return row ? serializeForClient(row) : null;
}

export async function createDiscount(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = discountSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on",
    minOrderAmount: raw.minOrderAmount || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  try {
    await db.discount.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        value: data.value,
        minOrderAmount:
          data.minOrderAmount === "" || data.minOrderAmount == null
            ? null
            : Number(data.minOrderAmount),
        isActive: data.isActive,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
      },
    });
  } catch {
    return { error: { code: ["Code already exists"] } };
  }

  revalidate();
  return { success: true };
}

export async function updateDiscount(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = discountSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on",
    minOrderAmount: raw.minOrderAmount || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  try {
    await db.discount.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        value: data.value,
        minOrderAmount:
          data.minOrderAmount === "" || data.minOrderAmount == null
            ? null
            : Number(data.minOrderAmount),
        isActive: data.isActive,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
      },
    });
  } catch {
    return { error: { code: ["Code already exists"] } };
  }

  revalidate();
  return { success: true };
}

export async function validateDiscountForOrder(code: string, subtotal: number) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Enter a discount code" };

  const discount = await db.discount.findUnique({ where: { code: normalized } });
  if (!discount) return { error: "Invalid discount code" };

  const d = {
    type: discount.type,
    value: Number(discount.value),
    minOrderAmount: discount.minOrderAmount != null ? Number(discount.minOrderAmount) : null,
    isActive: discount.isActive,
    validFrom: discount.validFrom,
    validTo: discount.validTo,
  };

  if (!isDiscountValid(d, subtotal)) {
    return { error: "Discount is not valid for this order (inactive, expired, or below minimum)" };
  }

  const amount = calculateDiscountAmount(d, subtotal);
  return {
    success: true,
    discountId: discount.id,
    code: discount.code,
    name: discount.name,
    discountAmount: amount,
  };
}
