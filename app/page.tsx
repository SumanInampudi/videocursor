import Link from "next/link";
import { getDashboardStats, getInventoryItems } from "@/app/actions/inventory";
import { getYieldResults } from "@/app/actions/recipes";
import { Button } from "@/components/ui/Button";
import { YieldCard } from "@/components/yield/YieldCard";
import { formatCurrency } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, lowStockItems, yieldResults] = await Promise.all([
    getDashboardStats(),
    getInventoryItems({ lowStockOnly: true }),
    getYieldResults(),
  ]);

  const topYields = yieldResults.filter((r) => r.canMake).slice(0, 3);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-servora-charcoal">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Overview of your inventory and recipe production capacity
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/new">
            <Button>Add Inventory</Button>
          </Link>
          <Link href="/recipes/new">
            <Button variant="secondary">Add Recipe</Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Items" value={String(stats.totalItems)} />
        <StatCard
          label="Low Stock Items"
          value={String(stats.lowStockCount)}
          highlight={stats.lowStockCount > 0 ? "danger" : undefined}
        />
        <StatCard label="Total Inventory Value" value={formatCurrency(stats.totalValue)} />
        <StatCard label="Recipes" value={String(stats.recipeCount)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-servora-charcoal">
              What Can You Make?
            </h2>
            <Link href="/yield" className="text-sm text-servora-yellow hover:underline">
              View all →
            </Link>
          </div>
          {topYields.length > 0 ? (
            <div className="space-y-3">
              {topYields.map((result, index) => (
                <YieldCard key={result.recipeId} result={result} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No recipes can be made with current stock. Add inventory or create recipes.
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-servora-charcoal">Low Stock Alerts</h2>
            <Link href="/inventory?lowStock=true" className="text-sm text-servora-red hover:underline">
              View all →
            </Link>
          </div>
          {lowStockItems.length > 0 ? (
            <div className="rounded-lg border border-servora-red/30 bg-red-50">
              <ul className="divide-y divide-red-100">
                {lowStockItems.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-servora-charcoal">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-servora-red">
                        {Number(item.quantity)} {item.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Reorder at {Number(item.reorderLevel)} {item.unit}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              All items are above reorder levels.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "danger";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight === "danger" ? "text-servora-red" : "text-servora-charcoal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
