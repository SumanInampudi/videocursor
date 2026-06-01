import Link from "next/link";
import { getCustomerOptions } from "@/app/actions/customers";
import { getRecipesForOrdering } from "@/app/actions/orders";
import { OrderForm } from "@/components/orders/OrderForm";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [recipes, customers] = await Promise.all([
    getRecipesForOrdering(),
    getCustomerOptions(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/orders" className="text-sm text-servora-yellow hover:underline">
          ← Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-servora-charcoal">Place order</h1>
            <p className="text-sm text-gray-500">
              Simple form with thumbnails and barcode scan. For iPad / counter use, open
              full-screen POS.
            </p>
          </div>
          <Link href="/orders/pos">
            <Button className="min-h-[44px] whitespace-nowrap">Open POS register →</Button>
          </Link>
        </div>
      </div>
      <OrderForm recipes={recipes} customers={customers} />
    </div>
  );
}
