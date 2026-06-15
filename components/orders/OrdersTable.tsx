import Link from "next/link";
import {
  OrderMetaBadges,
  computeOrderDisplayTotal,
} from "@/components/orders/OrderMetaBadges";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { formatDateTimeIST } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { formatCurrency } from "@/lib/units";
import type { OrderPaymentMethod, OrderStatus } from "@prisma/client";

export type OrderListRow = {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string | null;
  customer?: { id: string; name: string } | null;
  discountCode?: string | null;
  discountTotal?: number | { toString(): string } | null;
  subtotal?: number | { toString(): string } | null;
  paymentMethod?: OrderPaymentMethod | null;
  paidAt?: Date | string | null;
  status: OrderStatus;
  createdAt: Date | string;
  lineItems: {
    id: string;
    quantity: number;
    unitSalePrice: number | { toString(): string };
    productName: string;
    product: { name: string; yieldUnit: string } | null;
  }[];
};

function formatItemsSummary(lineItems: OrderListRow["lineItems"], max = 2) {
  const parts = lineItems.map(
    (line) => `${line.quantity}× ${line.product?.name ?? line.productName}`
  );
  if (parts.length <= max) {
    return parts.join(", ");
  }
  const shown = parts.slice(0, max).join(", ");
  return `${shown} +${parts.length - max} more`;
}

export function OrdersTable({ orders }: { orders: OrderListRow[] }) {
  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No orders match your filters.
      </p>
    );
  }

  return (
    <DataTable scroll>
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th className="hidden sm:table-cell">Items</th>
            <th>Status</th>
            <th className="text-right">Total</th>
            <th className="hidden md:table-cell">Placed</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const { total } = computeOrderDisplayTotal(order);
            return (
              <tr key={order.id}>
                <td>
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium hover:text-brand-700"
                  >
                    {order.orderNumber}
                  </Link>
                  <OrderMetaBadges order={order} />
                </td>
                <td className="hidden max-w-[220px] truncate text-muted sm:table-cell">
                  {formatItemsSummary(order.lineItems)}
                </td>
                <td className="text-muted">{ORDER_STATUS_LABELS[order.status]}</td>
                <td className="text-right font-medium tabular-nums">
                  {formatCurrency(total)}
                </td>
                <td className="hidden text-subtle md:table-cell">
                  {formatDateTimeIST(order.createdAt)}
                </td>
                <td className="text-right">
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTable>
  );
}
