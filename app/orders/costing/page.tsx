import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OrderCostingGuidePage() {
  return (
    <div className="max-w-3xl">
      <Link href="/orders" className="link-brand text-sm">
        ← Back to orders
      </Link>

      <h1 className="mt-4 page-title">
        Inventory pricing & order profit
      </h1>

      <div className="prose prose-sm mt-6 space-y-6 text-gray-700">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">
            1. Current cost on inventory items
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Each inventory item has a <strong>cost per unit</strong> field (e.g. $/g). This
            is the price you use for planning and is updated when suppliers change rates.
            The dashboard total inventory value uses quantity × current cost.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">
            2. Cost history when prices change
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            When you edit an item and change <strong>cost per unit</strong>, the app appends
            a row to <strong>cost price history</strong> (see any inventory edit page). That
            gives you an audit trail of supplier price increases over time without rewriting
            past orders.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">
            3. Recipe pricing page (estimates)
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            On{" "}
            <Link href="/recipes/pricing" className="link-brand">
              recipe pricing
            </Link>
            , estimated ingredient cost uses a <strong>weighted average</strong> of active
            stock in the matching unit. That is a live estimate — not locked until an order
            ships.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">
            4. Orders lock cost at fulfillment
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Sale price is snapshotted when the order is placed. When you move an order from{" "}
            <strong>Processing → Ready</strong>, the app deducts inventory and records each
            deduction with the <strong>cost per unit at that moment</strong>. Line profit =
            revenue − sum(deduction costs). Future price changes do not alter completed
            orders.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-amber-50 p-5">
          <h2 className="section-title">
            Advanced: FIFO / batches (future)
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            This MVP uses current average cost and deducts from the largest stock lots first.
            For strict FIFO or batch-level costing, you would add purchase receipts per batch
            and consume oldest batches first — the order consumption table is designed to
            store per-deduction costs for that extension.
          </p>
        </section>
      </div>

      <div className="mt-8 flex gap-2">
        <Link href="/orders/new">
          <Button>Place order</Button>
        </Link>
        <Link href="/inventory">
          <Button variant="secondary">Manage inventory</Button>
        </Link>
      </div>
    </div>
  );
}
