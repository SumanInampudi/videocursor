import Link from "next/link";
import { getCustomerOptions } from "@/app/actions/customers";
import { getProductsForOrdering } from "@/app/actions/orders";
import { OrderForm } from "@/components/orders/OrderForm";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [products, customers] = await Promise.all([
    getProductsForOrdering(),
    getCustomerOptions(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/orders" className="link-brand text-sm">
          ← Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Place order</h1>
            <p className="text-sm text-gray-500">
              Simple form with thumbnails for quick ordering. For iPad / counter use, open
              full-screen POS register.
            </p>
          </div>
          <Link href="/orders/pos">
            <Button className="min-h-[44px] whitespace-nowrap">Open POS register →</Button>
          </Link>
        </div>
      </div>
      <OrderForm products={products} customers={customers} />
    </div>
  );
}
