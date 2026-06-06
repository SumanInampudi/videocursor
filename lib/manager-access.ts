import "server-only";

import { requireBusinessContext } from "@/lib/business-context";
import { isAdminRole } from "@/lib/permissions";

export async function assertManagerPromotionAccess(): Promise<
  { error: string } | { userId: string | null }
> {
  const ctx = await requireBusinessContext();
  if (!isAdminRole(ctx.role)) {
    return { error: "Only managers can apply open discounts or comp items" };
  }
  return { userId: ctx.userId };
}
