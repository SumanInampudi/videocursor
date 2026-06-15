import "server-only";

import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { isBirthdayMonth, type CustomerSegmentType } from "@/lib/promotion-engine/segments";

export type CustomerPromotionContext = {
  customerId: string | null;
  activeSegments: CustomerSegmentType[];
  deliveredOrderCount: number;
};

export async function resolveCustomerPromotionContext(
  businessId: string,
  customerId: string | null | undefined
): Promise<CustomerPromotionContext> {
  if (!customerId) {
    return { customerId: null, activeSegments: [], deliveredOrderCount: 0 };
  }

  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true, dateOfBirth: true },
  });

  if (!customer) {
    return { customerId: null, activeSegments: [], deliveredOrderCount: 0 };
  }

  const deliveredOrderCount = await db.order.count({
    where: {
      businessId,
      customerId,
      status: OrderStatus.DELIVERED,
    },
  });

  const activeSegments: CustomerSegmentType[] = [];
  if (deliveredOrderCount === 0) {
    activeSegments.push("FIRST_ORDER");
  }
  if (customer.dateOfBirth && isBirthdayMonth(customer.dateOfBirth)) {
    activeSegments.push("BIRTHDAY_MONTH");
  }
  if (deliveredOrderCount >= 2) {
    activeSegments.push("RETURNING");
  }

  return {
    customerId,
    activeSegments,
    deliveredOrderCount,
  };
}
