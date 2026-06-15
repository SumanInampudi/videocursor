import "server-only";

import { getTaxSettingsForBusiness } from "@/app/actions/tax-settings";
import {
  computeOrderTaxAmounts,
  taxSnapshotToOrderFields,
} from "@/lib/order-tax";

export async function buildOrderTaxFields(
  businessId: string,
  subtotal: number,
  discountTotal: number,
  tipAmount: number
) {
  const settings = await getTaxSettingsForBusiness(businessId);
  const snapshot = computeOrderTaxAmounts(
    settings,
    subtotal,
    discountTotal,
    tipAmount
  );
  return taxSnapshotToOrderFields(snapshot);
}

export function parseTipFromForm(raw: FormData | Record<string, unknown>): number {
  const tip = Number(
    raw instanceof FormData ? raw.get("tipAmount") : raw.tipAmount
  );
  if (!Number.isFinite(tip) || tip < 0) return 0;
  return Math.round(tip * 100) / 100;
}
