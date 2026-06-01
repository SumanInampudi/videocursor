/** Inventory shortage messages from order placement. */
export function StockShortageAlert({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-servora-red" role="alert">
      <p className="font-semibold">Cannot place order — insufficient inventory</p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[13px]">
        {issues.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-red-800/80">
        Receive stock or reduce quantities, then try again.
      </p>
    </div>
  );
}
