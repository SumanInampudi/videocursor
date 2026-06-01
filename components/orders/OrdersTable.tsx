import Link from "next/link";
import {
  OrderMetaBadges,
  computeOrderDisplayTotal,
} from "@/components/orders/OrderMetaBadges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTimeIST } from "@/lib/format";
import { ORDER_STATUS_LABELS, orderStatusBadgeVariant } from "@/lib/order-status";
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
    recipeName: string;
    recipe: { name: string; yieldUnit: string } | null;
  }[];
};

function formatItemsSummary(lineItems: OrderListRow["lineItems"], max = 2) {
  const parts = lineItems.map(
    (line) => `${line.quantity}× ${line.recipe?.name ?? line.recipeName}`
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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Order
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:table-cell">
              Items
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Total
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 md:table-cell">
              Placed
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {orders.map((order) => {
            const { total } = computeOrderDisplayTotal(order);
            return (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-semibold text-servora-charcoal hover:text-servora-yellow"
                  >
                    {order.orderNumber}
                  </Link>
                  <OrderMetaBadges order={order} />
                </td>
                <td className="hidden max-w-[220px] truncate px-4 py-3 text-gray-600 sm:table-cell">
                  {formatItemsSummary(order.lineItems)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={orderStatusBadgeVariant(order.status)}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatCurrency(total)}
                </td>
                <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                  {formatDateTimeIST(order.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="ghost" className="text-xs">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
