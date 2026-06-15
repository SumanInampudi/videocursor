import { getYieldResults } from "@/app/actions/products";
import { YieldCard } from "@/components/yield/YieldCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function YieldPage() {
  const results = await getYieldResults();
  const available = results.filter((r) => r.canSell);
  const fullyCommitted = results.filter(
    (r) => r.canMake && (r.availableYield ?? 0) <= 0 && r.maxYield > 0
  );
  const cannotMake = results.filter((r) => !r.canMake);

  return (
    <div>
      <PageHeader
        title="Yield Calculator"
        subtitle="On-hand capacity from stock and BOM, minus portions already on active kitchen orders (until deducted or cancelled)."
        badge={
          <Badge variant="primary">
            {available.length} available · {fullyCommitted.length} committed · {cannotMake.length}{" "}
            blocked
          </Badge>
        }
      />

      {results.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">
            No products defined yet. Create products with raw materials to see yield calculations.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {available.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2">
                Available to sell
                <Badge variant="success">{available.length}</Badge>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((result, index) => (
                  <YieldCard key={result.productId} result={result} rank={index + 1} />
                ))}
              </div>
            </section>
          )}

          {fullyCommitted.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2 text-amber-800">
                Fully committed
                <Badge variant="warning">{fullyCommitted.length}</Badge>
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Stock on hand, but every portion is reserved on open kitchen orders.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fullyCommitted.map((result) => (
                  <YieldCard key={result.productId} result={result} />
                ))}
              </div>
            </section>
          )}

          {cannotMake.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2 text-danger">
                Cannot make
                <Badge variant="danger">{cannotMake.length}</Badge>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cannotMake.map((result) => (
                  <YieldCard key={result.productId} result={result} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
