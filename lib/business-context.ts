import "server-only";

import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export const DEFAULT_BUSINESS_ID = "default-business";

export type BusinessContext = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: UserRole;
  userId: string | null;
};

/** Resolve active business for server actions. Uses session membership or dev fallback. */
export async function requireBusinessContext(): Promise<BusinessContext> {
  const auth = await getAuthContext();

  if (auth.business) {
    return auth.business;
  }

  if (auth.roles === null) {
    const business = await db.business.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!business) {
      throw new Error("No business configured. Run seed or create a business.");
    }
    return {
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      role: "OWNER",
      userId: null,
    };
  }

  throw new Error("Business context required. Sign in and select a business.");
}

export function businessWhere(businessId: string) {
  return { businessId };
}
