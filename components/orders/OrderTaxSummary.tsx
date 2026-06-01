import { resolveOrderGrandTotal } from "@/lib/order-tax";
import { formatCurrency } from "@/lib/units";

type OrderTaxSummaryProps = {
  order: {
    subtotal?: number | { toString(): string } | null;
    discountTotal?: number | { toString(): string } | null;
    taxTotal?: number | { toString(): string } | null;
    tipAmount?: number | { toString(): string } | null;
    grandTotal?: number | { toString(): string } | null;
    gstRatePercent?: number | { toString(): string } | null;
    cgstAmount?: number | { toString(): string } | null;
    sgstAmount?: number | { toString(): string } | null;
    igstAmount?: number | { toString(): string } | null;
    pricesIncludeTax?: boolean | null;
  };
};

export function OrderTaxSummary({ order }: OrderTaxSummaryProps) {
  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discountTotal ?? 0);
  const taxTotal = Number(order.taxTotal ?? 0);
  const tip = Number(order.tipAmount ?? 0);
  const grand = resolveOrderGrandTotal(order);
  const gstRate = Number(order.gstRatePercent ?? 0);

  if (subtotal <= 0 && grand <= 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-600">Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-green-700">
          <span>Discount</span>
          <span>−{formatCurrency(discount)}</span>
        </div>
      )}
      {gstRate > 0 && taxTotal > 0 && (
        <>
          {Number(order.cgstAmount ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>CGST</span>
              <span>{formatCurrency(Number(order.cgstAmount))}</span>
            </div>
          )}
          {Number(order.sgstAmount ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>SGST</span>
              <span>{formatCurrency(Number(order.sgstAmount))}</span>
            </div>
          )}
          {Number(order.igstAmount ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>IGST</span>
              <span>{formatCurrency(Number(order.igstAmount))}</span>
            </div>
          )}
        </>
      )}
      {tip > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Tip</span>
          <span>{formatCurrency(tip)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-servora-charcoal">
        <span>Total</span>
        <span>{formatCurrency(grand)}</span>
      </div>
      {order.pricesIncludeTax && gstRate > 0 && (
        <p className="text-xs text-gray-500">Menu prices include GST @ {gstRate}%</p>
      )}
    </div>
  );
}
