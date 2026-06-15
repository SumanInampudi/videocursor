import type { TaxSettings, TaxSupplyType } from "@/lib/tax-settings";

export type OrderTaxSnapshot = {
  pricesIncludeTax: boolean;
  gstRatePercent: number;
  taxSupplyType: TaxSupplyType;
  taxableAmount: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  tipAmount: number;
  grandTotal: number;
  taxGstin: string | null;
  taxLegalName: string | null;
};

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Compute GST breakdown for an order (Indian CGST/SGST or IGST).
 * Discount is applied before tax. Tip is added after tax.
 */
export function computeOrderTaxAmounts(
  settings: TaxSettings,
  subtotal: number,
  discountTotal: number,
  tipAmount: number
): OrderTaxSnapshot {
  const netBeforeTax = roundMoney(Math.max(0, subtotal - discountTotal));
  const tip = roundMoney(Math.max(0, tipAmount));

  if (!settings.enabled || settings.gstRatePercent <= 0) {
    return {
      pricesIncludeTax: settings.pricesIncludeTax,
      gstRatePercent: 0,
      taxSupplyType: settings.supplyType,
      taxableAmount: netBeforeTax,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      taxTotal: 0,
      tipAmount: tip,
      grandTotal: roundMoney(netBeforeTax + tip),
      taxGstin: settings.gstin || null,
      taxLegalName: settings.legalName || null,
    };
  }

  const rate = settings.gstRatePercent;
  let taxableAmount: number;
  let taxTotal: number;

  if (settings.pricesIncludeTax) {
    taxableAmount = roundMoney(netBeforeTax / (1 + rate / 100));
    taxTotal = roundMoney(netBeforeTax - taxableAmount);
  } else {
    taxableAmount = netBeforeTax;
    taxTotal = roundMoney((taxableAmount * rate) / 100);
  }

  const halfRate = rate / 2;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let cgstPercent = 0;
  let sgstPercent = 0;
  let igstPercent = 0;

  if (settings.supplyType === "INTER_STATE") {
    igstPercent = rate;
    igstAmount = taxTotal;
  } else {
    cgstPercent = halfRate;
    sgstPercent = halfRate;
    cgstAmount = roundMoney(taxTotal / 2);
    sgstAmount = roundMoney(taxTotal - cgstAmount);
  }

  const grandBeforeTip = settings.pricesIncludeTax
    ? netBeforeTax
    : roundMoney(netBeforeTax + taxTotal);

  return {
    pricesIncludeTax: settings.pricesIncludeTax,
    gstRatePercent: rate,
    taxSupplyType: settings.supplyType,
    taxableAmount,
    cgstPercent,
    sgstPercent,
    igstPercent,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxTotal,
    tipAmount: tip,
    grandTotal: roundMoney(grandBeforeTip + tip),
    taxGstin: settings.gstin || null,
    taxLegalName: settings.legalName || null,
  };
}

/** Prisma-friendly decimal fields from snapshot. */
export function taxSnapshotToOrderFields(snapshot: OrderTaxSnapshot) {
  return {
    pricesIncludeTax: snapshot.pricesIncludeTax,
    gstRatePercent: snapshot.gstRatePercent,
    taxSupplyType: snapshot.taxSupplyType,
    taxableAmount: snapshot.taxableAmount,
    cgstPercent: snapshot.cgstPercent,
    sgstPercent: snapshot.sgstPercent,
    igstPercent: snapshot.igstPercent,
    cgstAmount: snapshot.cgstAmount,
    sgstAmount: snapshot.sgstAmount,
    igstAmount: snapshot.igstAmount,
    taxTotal: snapshot.taxTotal,
    tipAmount: snapshot.tipAmount,
    grandTotal: snapshot.grandTotal,
    taxGstin: snapshot.taxGstin,
    taxLegalName: snapshot.taxLegalName,
  };
}

/** Display total for legacy orders without grandTotal. */
export function resolveOrderGrandTotal(order: {
  grandTotal?: number | { toString(): string } | null;
  subtotal?: number | { toString(): string } | null;
  discountTotal?: number | { toString(): string } | null;
  taxTotal?: number | { toString(): string } | null;
  tipAmount?: number | { toString(): string } | null;
  pricesIncludeTax?: boolean | null;
}): number {
  if (order.grandTotal != null) return Number(order.grandTotal);
  const sub = Number(order.subtotal ?? 0);
  const disc = Number(order.discountTotal ?? 0);
  const tax = Number(order.taxTotal ?? 0);
  const tip = Number(order.tipAmount ?? 0);
  const net = sub - disc;
  if (order.pricesIncludeTax === false) return roundMoney(net + tax + tip);
  return roundMoney(net + tip);
}
