import { getYieldResults } from "@/app/actions/recipes";
import { YieldCard } from "@/components/yield/YieldCard";

export const dynamic = "force-dynamic";

export default async function YieldPage() {
  const results = await getYieldResults();
  const canMake = results.filter((r) => r.canMake);
  const cannotMake = results.filter((r) => !r.canMake);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-servora-charcoal">Yield Calculator</h1>
        <p className="text-sm text-gray-500">
          See how much of each recipe you can make with current inventory. Bottleneck
          ingredients are highlighted.
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No recipes defined yet. Create recipes with ingredients to see yield calculations.
        </div>
      ) : (
        <div className="space-y-8">
          {canMake.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-servora-charcoal">
                Can Make ({canMake.length})
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
              <h2 className="mb-4 text-lg font-semibold text-servora-red">
                Cannot Make ({cannotMake.length})
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
