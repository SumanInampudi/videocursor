/** Estimate kitchen prep duration (parallel station: longest item). */
export function estimateOrderPrepMinutes(
  lines: { quantity: number; prepTimeMinutes?: number | null }[]
): number | null {
  let max = 0;
  let hasAny = false;

  for (const line of lines) {
    const base = line.prepTimeMinutes;
    if (base == null || base <= 0) continue;
    hasAny = true;
    const extra = Math.max(0, line.quantity - 1) * Math.ceil(base * 0.25);
    max = Math.max(max, base + extra);
  }

  return hasAny ? max : null;
}

export function formatPrepDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatReadyByTime(prepMinutes: number, from: Date = new Date()): string {
  const ready = new Date(from.getTime() + prepMinutes * 60_000);
  return ready.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
