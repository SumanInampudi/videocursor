import Link from "next/link";
import { getRecipesForOrdering } from "@/app/actions/orders";
import { OrderForm } from "@/components/orders/OrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const recipes = await getRecipesForOrdering();

  return (
    <div>
      <div className="mb-6">
        <Link href="/orders" className="text-sm text-servora-yellow hover:underline">
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Place order</h1>
        <p className="text-sm text-gray-500">
          Scan recipe barcodes or tap items to build the cart. Inventory is deducted when
          you mark the order ready.
        </p>
      </div>
      <OrderForm recipes={recipes} />
    </div>
  );
}
