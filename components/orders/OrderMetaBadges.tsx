import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPaymentMethod } from "@/lib/pos-payment";
import { formatCurrency } from "@/lib/units";
import type { OrderPaymentMethod } from "@prisma/client";

export type OrderMeta = {
  customerId?: string | null;
  customerName?: string | null;
  customer?: { id: string; name: string } | null;
  discountCode?: string | null;
  discountTotal?: number | { toString(): string } | null;
  subtotal?: number | { toString(): string } | null;
  paymentMethod?: OrderPaymentMethod | null;
  paidAt?: string | Date | null;
};

export function computeOrderDisplayTotal(order: {
  lineItems: { quantity: number; unitSalePrice: number | { toString(): string } }[];
  subtotal?: number | { toString(): string } | null;
  discountTotal?: number | { toString(): string } | null;
}) {
  const lineSubtotal = order.lineItems.reduce(
    (sum, line) => sum + Number(line.unitSalePrice) * line.quantity,
    0
  );
  const subtotal = order.subtotal != null ? Number(order.subtotal) : lineSubtotal;
  const discount = Number(order.discountTotal ?? 0);
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

export function OrderMetaBadges({ order }: { order: OrderMeta }) {
  const discount = Number(order.discountTotal ?? 0);
  const hasCustomer = order.customer ?? order.customerId;
  const displayName =
    order.customer?.name ?? (order.customerName?.trim() || null);

  if (!hasCustomer && !displayName && !order.discountCode && discount <= 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {order.customer ? (
        <Link href={`/customers/${order.customer.id}`} className="inline-flex">
          <Badge variant="default">{order.customer.name}</Badge>
        </Link>
      ) : displayName ? (
        <Badge variant="default">{displayName}</Badge>
      ) : null}
      {order.discountCode && (
        <span title="Promo code applied">
          <Badge variant="warning">
            {order.discountCode}
            {discount > 0 && ` · −${formatCurrency(discount)}`}
          </Badge>
        </span>
      )}
      {order.paymentMethod && (
        <span title={order.paidAt ? "Paid at register" : undefined}>
          <Badge variant="success">Paid · {formatPaymentMethod(order.paymentMethod)}</Badge>
        </span>
      )}
    </div>
  );
}
