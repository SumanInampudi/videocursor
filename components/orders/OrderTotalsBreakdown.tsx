"use client";

import type { OrderTaxSnapshot } from "@/lib/order-tax";
import { formatCurrency } from "@/lib/units";

type OrderTotalsBreakdownProps = {
  subtotal: number;
  discountAmount: number;
  tax: OrderTaxSnapshot;
  compact?: boolean;
};

export function OrderTotalsBreakdown({
  subtotal,
  discountAmount,
  tax,
  compact = false,
}: OrderTotalsBreakdownProps) {
  const text = compact ? "text-sm" : "text-sm";
  const bold = compact ? "text-base" : "text-xl";

  return (
    <div className={`space-y-1 ${text}`}>
      <div className="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-green-700">
          <span>Discount</span>
          <span>−{formatCurrency(discountAmount)}</span>
        </div>
      )}
      {tax.gstRatePercent > 0 && (
        <>
          <div className="flex justify-between text-gray-600">
            <span>
              Taxable value
              {tax.pricesIncludeTax ? " (incl. in prices)" : ""}
            </span>
            <span>{formatCurrency(tax.taxableAmount)}</span>
          </div>
          {tax.cgstAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>CGST @ {tax.cgstPercent}%</span>
              <span>{formatCurrency(tax.cgstAmount)}</span>
            </div>
          )}
          {tax.sgstAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>SGST @ {tax.sgstPercent}%</span>
              <span>{formatCurrency(tax.sgstAmount)}</span>
            </div>
          )}
          {tax.igstAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>IGST @ {tax.igstPercent}%</span>
              <span>{formatCurrency(tax.igstAmount)}</span>
            </div>
          )}
          {!tax.pricesIncludeTax && tax.taxTotal > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>GST total</span>
              <span>{formatCurrency(tax.taxTotal)}</span>
            </div>
          )}
        </>
      )}
      {tax.tipAmount > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Tip</span>
          <span>{formatCurrency(tax.tipAmount)}</span>
        </div>
      )}
      <div className={`flex justify-between font-bold text-servora-charcoal ${bold}`}>
        <span>Total</span>
        <span>{formatCurrency(tax.grandTotal)}</span>
      </div>
    </div>
  );
}
