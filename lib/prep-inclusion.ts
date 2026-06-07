import "server-only";

import { db } from "@/lib/db";
import { ProductType } from "@prisma/client";

/** Ensure prep batches included as sides have output stock and a serving size. */
export async function validatePrepInclusionTargets(
  businessId: string,
  inclusionIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (inclusionIds.length === 0) return { ok: true };

  const preps = await db.product.findMany({
    where: {
      businessId,
      id: { in: inclusionIds },
      productType: ProductType.PREP,
    },
    select: {
      name: true,
      inclusionOutputQuantity: true,
      prepOutputInventoryItemId: true,
    },
  });

  for (const prep of preps) {
    if (!prep.prepOutputInventoryItemId) {
      return { ok: false, message: `Prep "${prep.name}" has no output stock configured` };
    }
    if (
      prep.inclusionOutputQuantity == null ||
      Number(prep.inclusionOutputQuantity) <= 0
    ) {
      return {
        ok: false,
        message: `Set "per inclusion serving" on prep "${prep.name}" before using it as a free side`,
      };
    }
  }

  return { ok: true };
}
