"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateOrderStatus } from "@/app/actions/orders";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/units";
import { OrderStatus } from "@prisma/client";

type OrderLine = {
  id: string;
  quantity: number;
  unitSalePrice: { toString(): string };
  recipeName: string;
  recipe: { name: string; yieldUnit: string } | null;
};

type OrderCardProps = {
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    status: OrderStatus;
    createdAt: Date;
    lineItems: OrderLine[];
  };
  nextAction?: { label: string; status: OrderStatus };
};

export function OrderCard({ order, nextAction }: OrderCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const total = order.lineItems.reduce(
    (sum, line) => sum + Number(line.unitSalePrice) * line.quantity,
    0
  );

  function handleAdvance() {
    if (!nextAction) return;
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, nextAction.status);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/orders/${order.id}`}
            className="font-semibold text-servora-charcoal hover:text-servora-yellow"
          >
            {order.orderNumber}
          </Link>
          {order.customerName && (
            <p className="text-xs text-gray-500">{order.customerName}</p>
          )}
        </div>
        <span className="text-sm font-medium text-servora-charcoal">
          {formatCurrency(total)}
        </span>
      </div>

      <ul className="mb-3 space-y-1 text-sm text-gray-600">
        {order.lineItems.map((line) => (
          <li key={line.id}>
            {line.quantity}× {line.recipe?.name ?? line.recipeName}
          </li>
        ))}
      </ul>

      <p className="mb-3 text-xs text-gray-400">
        {new Date(order.createdAt).toLocaleString()}
      </p>

      <div className="flex gap-2">
        <Link href={`/orders/${order.id}`} className="flex-1">
          <Button variant="ghost" className="w-full text-xs">
            Details
          </Button>
        </Link>
        {nextAction && (
          <Button
            className="flex-1 text-xs"
            disabled={isPending}
            onClick={handleAdvance}
          >
            {nextAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
