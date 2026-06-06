import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AppliedPromotion } from "@/lib/promotion-engine/types";

export async function persistOrderAppliedPromotions(
  orderId: string,
  lineItems: { id: string; productId: string | null }[],
  appliedPromotions: AppliedPromotion[]
) {
  if (appliedPromotions.length === 0) return;

  for (const applied of appliedPromotions) {
    const record = await db.orderAppliedPromotion.create({
      data: {
        orderId,
        discountId: applied.discountId,
        kind: applied.kind,
        name: applied.name,
        code: applied.code,
        discountAmount: applied.discountAmount,
        reason: applied.reason ?? null,
        appliedByUserId: applied.appliedByUserId ?? null,
        configSnapshot: applied.configSnapshot as Prisma.InputJsonValue,
      },
    });

    for (const allocation of applied.lineAllocations) {
      const line = lineItems.find((item) => item.productId === allocation.productId);
      if (!line) continue;

      await db.orderLineDiscount.create({
        data: {
          orderAppliedPromotionId: record.id,
          orderLineItemId: line.id,
          discountAmount: allocation.discountAmount,
          grossRevenue: allocation.grossRevenue,
          netRevenue: allocation.netRevenue,
        },
      });
    }

    if (applied.discountId) {
      await db.discount.update({
        where: { id: applied.discountId },
        data: { redemptionCount: { increment: 1 } },
      });
    }
  }
}
