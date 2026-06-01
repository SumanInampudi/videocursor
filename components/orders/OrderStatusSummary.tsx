import Link from "next/link";

type OrderStatusSummaryProps = {
  newCount: number;
  processingCount: number;
  readyCount: number;
  deliveredToday: number;
};

const ITEMS = [
  { key: "new", label: "New", color: "border-amber-200 bg-amber-50 text-amber-900" },
  { key: "processing", label: "Processing", color: "border-blue-200 bg-blue-50 text-blue-900" },
  { key: "ready", label: "Ready", color: "border-green-200 bg-green-50 text-green-900" },
  { key: "delivered", label: "Delivered today", color: "border-gray-200 bg-gray-50 text-gray-700" },
] as const;

export function OrderStatusSummary({
  newCount,
  processingCount,
  readyCount,
  deliveredToday,
}: OrderStatusSummaryProps) {
  const values = {
    new: newCount,
    processing: processingCount,
    ready: readyCount,
    delivered: deliveredToday,
  };

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ITEMS.map((item) => (
          <li
            key={item.key}
            className={`rounded-lg border px-4 py-3 text-center ${item.color}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{item.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{values[item.key]}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-500">
        Kitchen staff process orders on the{" "}
        <Link href="/orders/kitchen" className="font-medium text-servora-yellow hover:underline">
          kitchen display
        </Link>
        . Open it full-screen on the pass monitor.
      </p>
    </div>
  );
}
