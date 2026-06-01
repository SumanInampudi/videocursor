import Link from "next/link";
import { Suspense } from "react";
import { getOrderDashboardStats, getOrdersList } from "@/app/actions/orders";
import { ORDERS_PAGE_SIZE } from "@/lib/orders-list";
import { OrderListFilters } from "@/components/orders/OrderListFilters";
import { OrderStatusSummary } from "@/components/orders/OrderStatusSummary";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { OrderPaymentMethod, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  payment?: string;
  today?: string;
  page?: string;
}>;

function parseOrdersListParams(params: Awaited<SearchParams>) {
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status =
    params.status && Object.values(OrderStatus).includes(params.status as OrderStatus)
      ? (params.status as OrderStatus)
      : undefined;

  let payment: OrderPaymentMethod | "unpaid" | undefined;
  if (params.payment === "unpaid") {
    payment = "unpaid";
  } else if (
    params.payment &&
    Object.values(OrderPaymentMethod).includes(params.payment as OrderPaymentMethod)
  ) {
    payment = params.payment as OrderPaymentMethod;
  }

  return {
    search: params.q,
    status,
    payment,
    todayOnly: params.today === "1",
    page,
  };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const listFilters = parseOrdersListParams(params);

  const [stats, list] = await Promise.all([
    getOrderDashboardStats(),
    getOrdersList(listFilters),
  ]);

  const queryForPagination: Record<string, string | undefined> = {
    q: params.q,
    status: params.status,
    payment: params.payment,
    today: params.today === "1" ? "1" : undefined,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Orders</h1>
          <p className="text-sm text-gray-500">
            Browse and search orders. Kitchen staff use the kitchen display to run the line.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/orders/kitchen">
            <Button className="min-h-[44px]">Open kitchen display</Button>
          </Link>
          <Link href="/orders/pos">
            <Button variant="secondary" className="min-h-[44px]">
              POS register
            </Button>
          </Link>
        </div>
      </div>

      <OrderStatusSummary
        newCount={stats.newCount}
        processingCount={stats.processingCount}
        readyCount={stats.readyCount}
        deliveredToday={stats.deliveredToday}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-servora-charcoal">All orders</h2>

        <Suspense fallback={null}>
          <OrderListFilters />
        </Suspense>

        <OrdersTable orders={list.orders} />

        <div className="mt-4">
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            pageSize={ORDERS_PAGE_SIZE}
            pathname="/orders"
            query={queryForPagination}
          />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/orders/new" className="text-servora-yellow hover:underline">
          Simple order form
        </Link>
        <span className="text-gray-300">·</span>
        <Link href="/orders/costing" className="text-servora-yellow hover:underline">
          How costing works
        </Link>
      </div>
    </div>
  );
}
