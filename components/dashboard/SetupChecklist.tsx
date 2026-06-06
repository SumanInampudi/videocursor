import Link from "next/link";
import type { SetupStep } from "@/app/actions/setup";
import { Badge } from "@/components/ui/Badge";

type SetupChecklistProps = {
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
};

export function SetupChecklist({ steps, completedCount, totalCount }: SetupChecklistProps) {
  return (
    <section className="card mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-title">Getting started</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set up your venue step by step — {completedCount} of {totalCount} complete.
          </p>
        </div>
        <Badge variant={completedCount === totalCount ? "success" : "primary"}>
          {completedCount}/{totalCount}
        </Badge>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-gray-50 ${
                step.done ? "border-green-200 bg-green-50/40" : "border-gray-200"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
                aria-hidden
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className="min-w-0">
                <span className="font-medium text-servora-charcoal">{step.label}</span>
                <span className="mt-0.5 block text-sm text-gray-500">{step.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
