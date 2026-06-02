import { getYieldResults } from "@/app/actions/recipes";
import { YieldCard } from "@/components/yield/YieldCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function YieldPage() {
  const results = await getYieldResults();
  const canMake = results.filter((r) => r.canMake);
  const cannotMake = results.filter((r) => !r.canMake);

  return (
    <div>
      <PageHeader
        title="Yield Calculator"
        subtitle="How many portions you can make using usable stock (after ingredient wastage %). Recipe cost on pricing includes wastage and FIFO."
        badge={
          <Badge variant="primary">
            {canMake.length} ready · {cannotMake.length} blocked
          </Badge>
        }
      />

      {results.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">
            No recipes defined yet. Create recipes with ingredients to see yield calculations.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {canMake.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2">
                Can Make
                <Badge variant="success">{canMake.length}</Badge>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {canMake.map((result, index) => (
                  <YieldCard key={result.recipeId} result={result} rank={index + 1} />
                ))}
              </div>
            </section>
          )}

          {cannotMake.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2 text-danger">
                Cannot Make
                <Badge variant="danger">{cannotMake.length}</Badge>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cannotMake.map((result) => (
                  <YieldCard key={result.recipeId} result={result} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
