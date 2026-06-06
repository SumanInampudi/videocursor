import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OrderCostingGuidePage() {
  return (
    <div className="max-w-3xl">
      <Link href="/orders" className="link-brand text-sm">
        ← Back to orders
      </Link>

      <h1 className="mt-4 page-title">Inventory pricing & order profit</h1>

      <div className="prose prose-sm mt-6 space-y-6 text-gray-700">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">1. Current cost on inventory items</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Each stock line has a <strong>cost per unit</strong> (e.g. ₹/g). The dashboard
            inventory value uses quantity × this cost. Compatible units convert automatically
            (e.g. kg stock for a g recipe).
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">2. Restock & manual stock-in</h2>
          <p className="mt-2 text-sm leading-relaxed">
            When you <strong>receive / restock</strong> or increase quantity from the inventory
            form:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm leading-relaxed">
            <li>
              <strong>Same unit cost</strong> — new stock is tracked as a FIFO batch layer.
            </li>
            <li>
              <strong>Different unit cost</strong> — on-hand and new stock merge into one{" "}
              <strong>weighted average</strong> layer.
            </li>
          </ul>
          <p className="mt-2 text-sm leading-relaxed">
            Cost-only edits (no quantity change) revalue remaining stock at the new rate. Every
            change is recorded in <strong>cost price history</strong> on the inventory edit page.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">3. Product margin estimates</h2>
          <p className="mt-2 text-sm leading-relaxed">
            On{" "}
            <Link href="/products" className="link-brand">
              products
            </Link>
            , create/edit shows a live margin preview from current stock costs (including wastage
            %). That is an estimate until an order is fulfilled.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="section-title">4. Orders lock cost at fulfillment</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Sale price is snapshotted when the order is placed. When inventory is deducted
            (processing → ready), each line records the <strong>cost at that moment</strong> using
            FIFO layers (same-price batches) or the averaged layer after a price change. Line
            profit = revenue − ingredient cost. Completed orders are not rewritten when supplier
            prices change later.
          </p>
        </section>
      </div>

      <div className="mt-8 flex gap-2">
        <Link href="/orders/new">
          <Button>Place order</Button>
        </Link>
        <Link href="/inventory/receive">
          <Button variant="secondary">Receive stock</Button>
        </Link>
      </div>
    </div>
  );
}
