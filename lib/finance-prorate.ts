import { periodMonthToDateRange, startOfDay } from "@/lib/dates";

function daysInclusive(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

/** Prorate a monthly expense to the days overlapping the report range. */
export function prorateExpenseAmount(
  amount: number,
  periodMonth: string,
  rangeFrom: Date,
  rangeTo: Date
): number {
  const { from: monthStart, to: monthEnd } = periodMonthToDateRange(periodMonth);
  const overlapStart = new Date(
    Math.max(startOfDay(monthStart).getTime(), startOfDay(rangeFrom).getTime())
  );
  const overlapEnd = new Date(
    Math.min(startOfDay(monthEnd).getTime(), startOfDay(rangeTo).getTime())
  );
  if (overlapStart > overlapEnd) return 0;
  const monthDays = daysInclusive(monthStart, monthEnd);
  const overlapDays = daysInclusive(overlapStart, overlapEnd);
  return amount * (overlapDays / monthDays);
}
