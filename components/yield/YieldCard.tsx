import { Badge } from "@/components/ui/Badge";
import { YieldResult } from "@/lib/yield";

type YieldCardProps = {
  result: YieldResult;
  rank?: number;
};

export function YieldCard({ result, rank }: YieldCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          {rank !== undefined && (
            <span className="text-xs font-medium text-gray-400">#{rank}</span>
          )}
          <h3 className="text-lg font-semibold text-servora-charcoal">{result.recipeName}</h3>
          <p className="text-sm text-gray-500">{result.category}</p>
        </div>
        {result.canMake ? (
          <Badge variant="success">
            {result.maxYield} {result.yieldUnit}
          </Badge>
        ) : (
          <Badge variant="danger">Cannot make</Badge>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {result.canMake && result.bottleneckIngredient && (
          <p className="text-gray-600">
            <span className="font-medium text-servora-yellow">Bottleneck:</span>{" "}
            {result.bottleneckIngredient}
          </p>
        )}
        {result.missingIngredients.length > 0 && (
          <div>
            <p className="font-medium text-servora-red">Issues:</p>
            <ul className="mt-1 list-inside list-disc text-gray-600">
              {result.missingIngredients.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
