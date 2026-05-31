/** Start of calendar day in local server time. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of calendar day in local server time. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM for accounting / expense period. */
export function toPeriodMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function currentPeriodMonth(): string {
  return toPeriodMonth(new Date());
}

const PERIOD_MONTH_RE = /^(\d{4})-(\d{2})$/;

export function parsePeriodMonth(value: string | undefined): string | null {
  if (!value || !PERIOD_MONTH_RE.test(value)) return null;
  const month = parseInt(value.slice(5, 7), 10);
  if (month < 1 || month > 12) return null;
  return value;
}

/** First and last calendar day for a YYYY-MM period. */
export function periodMonthToDateRange(periodMonth: string): { from: Date; to: Date } {
  const match = PERIOD_MONTH_RE.exec(periodMonth);
  if (!match) {
    const today = new Date();
    return { from: startOfDay(today), to: endOfDay(today) };
  }
  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10) - 1;
  const from = startOfDay(new Date(year, month, 1));
  const to = endOfDay(new Date(year, month + 1, 0));
  return { from, to };
}

/** All YYYY-MM values overlapping an inclusive date range. */
export function periodMonthsInRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cur <= end) {
    months.push(toPeriodMonth(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  return months;
}

/** Default dashboard/report range: start of current month through today. */
export function defaultReportDateRange(): { from: string; to: string } {
  const today = new Date();
  const from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(today),
  };
}

export function formatPeriodMonthLabel(periodMonth: string): string {
  const parsed = parsePeriodMonth(periodMonth);
  if (!parsed) return periodMonth;
  const [year, month] = parsed.split("-").map(Number);
  return new Date(year!, month! - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
