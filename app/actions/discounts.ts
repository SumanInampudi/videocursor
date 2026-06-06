"use server";

import { revalidatePath } from "next/cache";
import {
  OrderChannel,
  OrderStatus,
  Prisma,
  PromotionScope,
  PromotionTargetRole,
  PromotionTargetType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { calculateDiscountAmount, isDiscountValid } from "@/lib/discount-calc";
import { mapDiscountToPromotion } from "@/lib/promotion-db";
import { buildPromotionHints } from "@/lib/promotion-engine/hints";
import { estimatePromotionImpact } from "@/lib/promotion-engine/impact";
import type { PromotionTierDef } from "@/lib/promotion-engine/types";
import { serializeForClient } from "@/lib/serialize";
import { discountSchema } from "@/lib/validations";
import type { z } from "zod";

const PATHS = ["/discounts", "/orders/new", "/orders/pos", "/"];

function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

function parseOptionalAmount(value: unknown) {
  return value === "" || value == null ? null : Number(value);
}

type DiscountInput = z.infer<typeof discountSchema>;

function parseCheckbox(raw: FormDataEntryValue | null | undefined) {
  return raw === "on" || raw === "true";
}

function parseTiersJson(raw: string | undefined, kind: DiscountInput["kind"]): PromotionTierDef[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as PromotionTierDef[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((tier, index) => ({
        thresholdAmount:
          kind === "TIERED_SPEND" && tier.thresholdAmount != null
            ? Number(tier.thresholdAmount)
            : null,
        thresholdQty:
          kind === "TIERED_QUANTITY" && tier.thresholdQty != null
            ? Number(tier.thresholdQty)
            : null,
        valueType: (tier.valueType === "FIXED" ? "FIXED" : "PERCENT") as PromotionTierDef["valueType"],
        value: Number(tier.value),
        sortOrder: Number(tier.sortOrder) > 0 ? Number(tier.sortOrder) : index + 1,
      }))
      .filter(
        (tier) =>
          tier.value > 0 &&
          ((kind === "TIERED_SPEND" && tier.thresholdAmount != null && tier.thresholdAmount > 0) ||
            (kind === "TIERED_QUANTITY" && tier.thresholdQty != null && tier.thresholdQty > 0))
      );
  } catch {
    return [];
  }
}

function buildPromotionExtras(data: DiscountInput) {
  const channels: OrderChannel[] = [];
  if (data.channelDineIn) channels.push("DINE_IN");
  if (data.channelOnline) channels.push("ONLINE");

  const scheduleJson =
    data.scheduleEnabled && data.scheduleStart && data.scheduleEnd
      ? {
          windows: [
            {
              daysOfWeek: (data.scheduleDays || "1,2,3,4,5,6,0")
                .split(",")
                .map((value) => Number(value.trim()))
                .filter((value) => !Number.isNaN(value)),
              start: data.scheduleStart,
              end: data.scheduleEnd,
            },
          ],
        }
      : {};

  const isItemLevel =
    data.kind === "ITEM_PERCENT" ||
    data.kind === "ITEM_FIXED" ||
    data.kind === "BOGO" ||
    data.kind === "COMBO_PRICE";
  let scope: PromotionScope = isItemLevel ? "LINE" : "ORDER";
  const targets: {
    role: PromotionTargetRole;
    targetType: PromotionTargetType;
    productId?: string;
    category?: string;
  }[] = [];

  let configJson: Prisma.InputJsonValue = {};

  if (data.kind === "BOGO") {
    configJson = {
      bogo: {
        buyQuantity: data.bogoBuyQuantity ?? 1,
        getQuantity: data.bogoGetQuantity ?? 1,
        getDiscountPercent: data.value,
        applyToCheapest: data.bogoApplyToCheapest !== false,
      },
    };
    const targetType = data.targetType ?? "PRODUCT";
    if (targetType === "ALL_PRODUCTS") {
      targets.push({ role: "APPLY_TO", targetType: "ALL_PRODUCTS" });
    } else if (targetType === "CATEGORY") {
      for (const category of (data.targetCategories || "").split(",")) {
        const trimmed = category.trim();
        if (trimmed) {
          targets.push({ role: "APPLY_TO", targetType: "CATEGORY", category: trimmed });
        }
      }
    } else {
      for (const productId of (data.targetProductIds || "").split(",")) {
        const trimmed = productId.trim();
        if (trimmed) {
          targets.push({ role: "APPLY_TO", targetType: "PRODUCT", productId: trimmed });
        }
      }
    }
  } else if (data.kind === "TIERED_SPEND" || data.kind === "TIERED_QUANTITY") {
    const tiers = parseTiersJson(data.tiersJson, data.kind);
    configJson = { tiers };
    const targetType = data.targetType ?? "ALL_PRODUCTS";
    if (targetType === "CATEGORY") {
      for (const category of (data.targetCategories || "").split(",")) {
        const trimmed = category.trim();
        if (trimmed) {
          targets.push({ role: "APPLY_TO", targetType: "CATEGORY", category: trimmed });
        }
      }
    } else if (targetType === "PRODUCT") {
      for (const productId of (data.targetProductIds || "").split(",")) {
        const trimmed = productId.trim();
        if (trimmed) {
          targets.push({ role: "APPLY_TO", targetType: "PRODUCT", productId: trimmed });
        }
      }
    }
  } else if (data.kind === "COMBO_PRICE") {
    configJson = { combo: { comboPrice: data.value } };
    for (const productId of (data.targetProductIds || "").split(",")) {
      const trimmed = productId.trim();
      if (trimmed) {
        targets.push({ role: "BUNDLE_MEMBER", targetType: "PRODUCT", productId: trimmed });
      }
    }
  } else if (isItemLevel) {
    const targetType = data.targetType ?? "ALL_PRODUCTS";
    if (targetType === "ALL_PRODUCTS") {
      targets.push({ role: "APPLY_TO", targetType: "ALL_PRODUCTS" });
    } else if (targetType === "CATEGORY") {
      for (const category of (data.targetCategories || "").split(",")) {
        const trimmed = category.trim();
        if (trimmed) {
          targets.push({ role: "APPLY_TO", targetType: "CATEGORY", category: trimmed });
        }
      }
    } else if (targetType === "PRODUCT") {
      for (const productId of (data.targetProductIds || "").split(",")) {
        const trimmed = productId.trim();
        if (trimmed) {
          targets.push({ role: "APPLY_TO", targetType: "PRODUCT", productId: trimmed });
        }
      }
    }
  }

  if (data.kind === "TIERED_SPEND" || data.kind === "TIERED_QUANTITY") {
    scope = targets.length > 0 ? "LINE" : "ORDER";
  }

  if (data.kind === "CUSTOMER_SEGMENT") {
    scope = "ORDER";
    configJson = {
      segment: data.customerSegment ?? "FIRST_ORDER",
      valueType: data.segmentValueType ?? "PERCENT",
      minVisitCount: data.segmentMinVisitCount ?? 2,
    };
  }

  const paymentMethods: import("@prisma/client").OrderPaymentMethod[] = [];
  if (data.paymentCash) paymentMethods.push("CASH");
  if (data.paymentCard) paymentMethods.push("CARD");
  if (data.paymentPhonePe) paymentMethods.push("PHONEPE");

  return {
    application: data.application,
    scope,
    channelsJson: channels,
    paymentMethodsJson: paymentMethods,
    scheduleJson,
    targets,
    configJson,
  };
}

async function replacePromotionTargets(
  discountId: string,
  targets: {
    role: PromotionTargetRole;
    targetType: PromotionTargetType;
    productId?: string;
    category?: string;
  }[]
) {
  await db.promotionTarget.deleteMany({ where: { discountId } });
  if (targets.length === 0) return;
  await db.promotionTarget.createMany({
    data: targets.map((target) => ({
      discountId,
      role: target.role,
      targetType: target.targetType,
      productId: target.productId ?? null,
      category: target.category ?? null,
    })),
  });
}

export async function getDiscounts(activeOnly = false) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const rows = await db.discount.findMany({
    where: {
      businessId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { code: "asc" },
  });
  return serializeForClient(rows);
}

export async function getDiscount(id: string) {
  const row = await db.discount.findUnique({
    where: { id },
    include: { targets: true },
  });
  return row ? serializeForClient(row) : null;
}

export async function getDiscountFormOptions() {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { businessId },
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { businessId },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);
  return serializeForClient({
    products,
    categories: categories.map((row) => row.category),
  });
}

export async function createDiscount(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = discountSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on",
    channelDineIn: parseCheckbox(raw.channelDineIn),
    channelOnline: parseCheckbox(raw.channelOnline),
    scheduleEnabled: parseCheckbox(raw.scheduleEnabled),
    bogoApplyToCheapest: parseCheckbox(raw.bogoApplyToCheapest),
    paymentCash: parseCheckbox(raw.paymentCash),
    paymentCard: parseCheckbox(raw.paymentCard),
    paymentPhonePe: parseCheckbox(raw.paymentPhonePe),
    minOrderAmount: raw.minOrderAmount || undefined,
    maxDiscountAmount: raw.maxDiscountAmount || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const extras = buildPromotionExtras(data);
  try {
    const { requireBusinessContext } = await import("@/lib/business-context");
    const { businessId } = await requireBusinessContext();
    const created = await db.discount.create({
      data: {
        businessId,
        code: data.code,
        name: data.name,
        kind: data.kind,
        application: extras.application,
        scope: extras.scope,
        value: data.value,
        minOrderAmount: parseOptionalAmount(data.minOrderAmount),
        maxDiscountAmount: parseOptionalAmount(data.maxDiscountAmount),
        isActive: data.isActive,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        scheduleJson: extras.scheduleJson,
        channelsJson: extras.channelsJson,
        paymentMethodsJson: extras.paymentMethodsJson,
        configJson: extras.configJson,
      },
    });
    await replacePromotionTargets(created.id, extras.targets);
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
    channelDineIn: parseCheckbox(raw.channelDineIn),
    channelOnline: parseCheckbox(raw.channelOnline),
    scheduleEnabled: parseCheckbox(raw.scheduleEnabled),
    bogoApplyToCheapest: parseCheckbox(raw.bogoApplyToCheapest),
    paymentCash: parseCheckbox(raw.paymentCash),
    paymentCard: parseCheckbox(raw.paymentCard),
    paymentPhonePe: parseCheckbox(raw.paymentPhonePe),
    minOrderAmount: raw.minOrderAmount || undefined,
    maxDiscountAmount: raw.maxDiscountAmount || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const extras = buildPromotionExtras(data);
  try {
    await db.discount.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        kind: data.kind,
        application: extras.application,
        scope: extras.scope,
        value: data.value,
        minOrderAmount: parseOptionalAmount(data.minOrderAmount),
        maxDiscountAmount: parseOptionalAmount(data.maxDiscountAmount),
        isActive: data.isActive,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        scheduleJson: extras.scheduleJson,
        channelsJson: extras.channelsJson,
        paymentMethodsJson: extras.paymentMethodsJson,
        configJson: extras.configJson,
      },
    });
    await replacePromotionTargets(id, extras.targets);
  } catch {
    return { error: { code: ["Code already exists"] } };
  }

  revalidate();
  return { success: true };
}

export async function evaluatePromotionsForCart(input: {
  cartLines: { productId: string; quantity: number }[];
  channel: OrderChannel;
  discountCode?: string;
  subtotal?: number;
  customerId?: string;
  paymentMethod?: import("@prisma/client").OrderPaymentMethod;
}) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const { buildLinePayloadsForBusiness, applyDiscountToLines } = await import(
    "@/lib/order-line-build"
  );

  if (input.cartLines.length === 0) {
    return {
      discountTotal: 0,
      discountCode: null,
      appliedPromotions: [] as { name: string; code: string | null; discountAmount: number; kind: string }[],
      autoPromotions: [] as { name: string; code: string | null; discountAmount: number; kind: string }[],
      eligibilityHints: [] as { name: string; message: string; kind: string }[],
    };
  }

  const built = await buildLinePayloadsForBusiness(businessId, input.cartLines);
  if ("error" in built) {
    return { error: built.error.lines?.[0] ?? "Could not evaluate promotions" };
  }

  const result = await applyDiscountToLines(
    businessId,
    input.discountCode,
    built.subtotal,
    built.payloads,
    {
      channel: input.channel,
      includeAuto: true,
      customerId: input.customerId,
      paymentMethod: input.paymentMethod ?? null,
    }
  );

  if ("error" in result) {
    return { error: result.error.discountCode?.[0] ?? "Invalid promotion" };
  }

  const appliedPromotions = result.appliedPromotions.map((row) => ({
    name: row.name,
    code: row.code,
    discountAmount: row.discountAmount,
    kind: row.kind,
  }));

  const promotionRows = await db.discount.findMany({
    where: { businessId, isActive: true },
    include: { targets: true },
  });
  const promotions = promotionRows.map(mapDiscountToPromotion);
  const appliedIds = new Set(
    result.appliedPromotions
      .map((row) => row.discountId)
      .filter((value): value is string => Boolean(value))
  );
  const eligibilityHints = buildPromotionHints(
    promotions,
    built.payloads,
    built.subtotal,
    input.channel,
    appliedIds
  ).map((hint) => ({
    name: hint.name,
    message: hint.message,
    kind: hint.kind,
  }));

  return {
    discountTotal: result.discountTotal,
    discountCode: result.discountCode,
    appliedPromotions,
    autoPromotions: appliedPromotions.filter((row) => !row.code),
    eligibilityHints,
  };
}

export async function validateDiscountForOrder(code: string, subtotal: number) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Enter a discount code" };

  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();
  const discount = await db.discount.findUnique({
    where: { businessId_code: { businessId, code: normalized } },
  });
  if (!discount) return { error: "Invalid discount code" };

  const promotion = mapDiscountToPromotion({ ...discount, targets: [] });
  const d = {
    kind: promotion.kind,
    value: promotion.value,
    minOrderAmount: promotion.minOrderAmount,
    maxDiscountAmount: promotion.maxDiscountAmount,
    isActive: promotion.isActive,
    validFrom: promotion.validFrom,
    validTo: promotion.validTo,
    schedule: promotion.schedule,
    channels: promotion.channels,
  };

  if (!isDiscountValid(d, subtotal, "DINE_IN")) {
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

export async function getDiscountImpactEstimate(
  discountId: string,
  expectedWeeklyRedemptions = 50
) {
  const { requireBusinessContext } = await import("@/lib/business-context");
  const { businessId } = await requireBusinessContext();

  const discount = await db.discount.findFirst({
    where: { id: discountId, businessId },
  });
  if (!discount) return null;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const recentOrders = await db.order.findMany({
    where: {
      businessId,
      status: OrderStatus.DELIVERED,
      createdAt: { gte: since },
      subtotal: { gt: 0 },
    },
    select: {
      subtotal: true,
      lineItems: {
        select: { revenue: true, ingredientCost: true },
      },
    },
    take: 500,
  });

  let revenue = 0;
  let cogs = 0;
  for (const order of recentOrders) {
    for (const line of order.lineItems) {
      const lineRevenue = line.revenue != null ? Number(line.revenue) : 0;
      revenue += lineRevenue;
      if (line.ingredientCost != null) cogs += Number(line.ingredientCost);
    }
  }

  const orderCount = recentOrders.length;
  const subtotalSum = recentOrders.reduce(
    (sum, order) => sum + Number(order.subtotal ?? 0),
    0
  );
  const avgOrderValue = orderCount > 0 ? subtotalSum / orderCount : 0;
  const grossMarginRate = revenue > 0 ? (revenue - cogs) / revenue : 0.55;

  const actualUses = await db.orderAppliedPromotion.count({
    where: { discountId, createdAt: { gte: since } },
  });

  const estimate = estimatePromotionImpact({
    promotion: {
      kind: discount.kind,
      value: Number(discount.value),
      minOrderAmount:
        discount.minOrderAmount != null ? Number(discount.minOrderAmount) : null,
      maxDiscountAmount:
        discount.maxDiscountAmount != null ? Number(discount.maxDiscountAmount) : null,
    },
    avgOrderValue,
    grossMarginRate,
    expectedWeeklyRedemptions,
    sampleOrderCount: orderCount,
  });

  return serializeForClient({
    ...estimate,
    discountName: discount.name,
    discountCode: discount.code,
    redemptionCount: discount.redemptionCount,
    actualUsesLast30Days: actualUses,
  });
}
