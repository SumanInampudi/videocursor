import { Badge } from "@/components/ui/Badge";
import { YieldResult } from "@/lib/yield";

type YieldCardProps = {
  result: YieldResult;
  rank?: number;
};

export function YieldCard({ result, rank }: YieldCardProps) {
  return (
    <div className="card-padded transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          {rank !== undefined && (
            <Badge variant="primary" className="mb-2 normal-case">
              #{rank}
            </Badge>
          )}
          <h3 className="text-lg font-bold text-charcoal">{result.productName}</h3>
          <p className="text-sm text-charcoal-muted">{result.category}</p>
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
          <p className="text-charcoal-muted">
            <span className="font-semibold text-brand-700">Bottleneck:</span>{" "}
            {result.bottleneckIngredient}
            {result.bottleneckNote ? (
              <span className="mt-1 block text-xs text-charcoal-muted">{result.bottleneckNote}</span>
            ) : null}
          </p>
        )}
        {result.missingIngredients.length > 0 && (
          <div>
            <p className="font-semibold text-danger">Issues</p>
            <ul className="mt-1 list-inside list-disc text-charcoal-muted">
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
