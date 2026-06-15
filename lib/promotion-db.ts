import "server-only";

import type { OrderChannel, OrderPaymentMethod, Prisma } from "@prisma/client";
import { parseCustomerSegmentConfig } from "@/lib/promotion-engine/segments";
import { parseScheduleJson } from "@/lib/promotion-engine/schedule";
import type {
  BogoConfig,
  ComboConfig,
  PromotionDefinition,
  PromotionTierDef,
  TieredConfig,
} from "@/lib/promotion-engine/types";

type DiscountRow = Prisma.DiscountGetPayload<{
  include: { targets: true };
}>;

function parseBogoConfig(configJson: unknown, value: number): BogoConfig | null {
  if (!configJson || typeof configJson !== "object") return null;
  const bogo = (configJson as Record<string, unknown>).bogo;
  if (!bogo || typeof bogo !== "object") return null;
  const row = bogo as Record<string, unknown>;
  return {
    buyQuantity: Number(row.buyQuantity) > 0 ? Number(row.buyQuantity) : 1,
    getQuantity: Number(row.getQuantity) > 0 ? Number(row.getQuantity) : 1,
    getDiscountPercent:
      Number(row.getDiscountPercent) > 0 ? Number(row.getDiscountPercent) : value,
    applyToCheapest: row.applyToCheapest !== false,
  };
}

function parseTieredConfig(configJson: unknown): TieredConfig | null {
  if (!configJson || typeof configJson !== "object") return null;
  const tiersRaw = (configJson as Record<string, unknown>).tiers;
  if (!Array.isArray(tiersRaw) || tiersRaw.length === 0) return null;

  const tiers: PromotionTierDef[] = tiersRaw
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const tier = row as Record<string, unknown>;
      const valueType = tier.valueType === "FIXED" ? "FIXED" : "PERCENT";
      const value = Number(tier.value);
      if (value <= 0) return null;
      return {
        thresholdAmount:
          tier.thresholdAmount != null && Number(tier.thresholdAmount) > 0
            ? Number(tier.thresholdAmount)
            : null,
        thresholdQty:
          tier.thresholdQty != null && Number(tier.thresholdQty) > 0
            ? Number(tier.thresholdQty)
            : null,
        valueType,
        value,
        sortOrder: Number(tier.sortOrder) > 0 ? Number(tier.sortOrder) : index + 1,
      } satisfies PromotionTierDef;
    })
    .filter((tier): tier is PromotionTierDef => tier != null);

  return tiers.length > 0 ? { tiers } : null;
}

function parseComboConfig(configJson: unknown, value: number): ComboConfig | null {
  if (!configJson || typeof configJson !== "object") return null;
  const combo = (configJson as Record<string, unknown>).combo;
  if (!combo || typeof combo !== "object") {
    return value > 0 ? { comboPrice: value } : null;
  }
  const row = combo as Record<string, unknown>;
  const comboPrice = Number(row.comboPrice);
  return comboPrice > 0 ? { comboPrice } : null;
}

export function mapDiscountToPromotion(row: DiscountRow): PromotionDefinition {
  let channels: OrderChannel[] = [];
  if (Array.isArray(row.channelsJson)) {
    channels = row.channelsJson.filter(
      (value): value is OrderChannel => value === "DINE_IN" || value === "ONLINE"
    );
  }

  const bogoConfig = row.kind === "BOGO" ? parseBogoConfig(row.configJson, Number(row.value)) : null;
  const comboConfig =
    row.kind === "COMBO_PRICE" ? parseComboConfig(row.configJson, Number(row.value)) : null;
  const tieredConfig =
    row.kind === "TIERED_SPEND" || row.kind === "TIERED_QUANTITY"
      ? parseTieredConfig(row.configJson)
      : null;
  const customerSegmentConfig =
    row.kind === "CUSTOMER_SEGMENT"
      ? parseCustomerSegmentConfig(row.configJson, Number(row.value))
      : null;

  let paymentMethods: OrderPaymentMethod[] = [];
  if (Array.isArray(row.paymentMethodsJson)) {
    paymentMethods = row.paymentMethodsJson.filter(
      (value): value is OrderPaymentMethod =>
        value === "CASH" || value === "CARD" || value === "PHONEPE"
    );
  }

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    application: row.application,
    scope: row.scope,
    stackingPolicy: row.stackingPolicy,
    priority: row.priority,
    value: Number(row.value),
    minOrderAmount: row.minOrderAmount != null ? Number(row.minOrderAmount) : null,
    maxDiscountAmount: row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
    isActive: row.isActive,
    validFrom: row.validFrom,
    validTo: row.validTo,
    schedule: parseScheduleJson(row.scheduleJson),
    channels,
    paymentMethods,
    targets: row.targets.map((target) => ({
      role: target.role,
      targetType: target.targetType,
      productId: target.productId,
      category: target.category,
    })),
    bogoConfig,
    comboConfig,
    tieredConfig,
    customerSegmentConfig,
  };
}
