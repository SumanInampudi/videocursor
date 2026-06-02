/** Primary timezone for calendar dates (matches business default & UI copy). */
export const APP_TIMEZONE = "Asia/Kolkata";

/** Calendar YYYY-MM-DD in app timezone — use for Prisma @db.Date values from the DB. */
export function formatCalendarDateString(
  date: Date,
  timeZone: string = APP_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/**
 * Parse YYYY-MM-DD for Prisma @db.Date storage without UTC day shift.
 * (Avoid `new Date("YYYY-MM-DD")` which is UTC midnight and can store/read as prior day.)
 */
export function parseCalendarDateString(
  value: string | undefined,
  fallback: Date = new Date()
): Date {
  if (!value) {
    return dateAtUtcNoon(formatCalendarDateString(fallback));
  }
  const match = DATE_INPUT_RE.exec(value.trim());
  if (!match) {
    return dateAtUtcNoon(formatCalendarDateString(fallback));
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return dateAtUtcNoon(formatCalendarDateString(fallback));
  }
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function dateAtUtcNoon(yyyyMmDd: string): Date {
  const match = DATE_INPUT_RE.exec(yyyyMmDd);
  if (!match) return new Date();
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
  );
}

/** YYYY-MM accounting month from a calendar date string or Date (IST). */
export function calendarDateToPeriodMonth(
  date: Date | string,
  timeZone: string = APP_TIMEZONE
): string {
  const key =
    typeof date === "string" ? date.slice(0, 10) : formatCalendarDateString(date, timeZone);
  return key.slice(0, 7);
}

/** Start of calendar day in local server time. */
export function toIST(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

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

const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift from `new Date("YYYY-MM-DD")`). */
export function parseDateInputValue(value: string | undefined, fallback: Date): Date {
  if (!value) return startOfDay(fallback);
  const match = DATE_INPUT_RE.exec(value.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? startOfDay(fallback) : startOfDay(d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? startOfDay(fallback) : startOfDay(parsed);
}

export function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  if (DATE_INPUT_RE.test(value.trim())) {
    return parseDateInputValue(value, fallback);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** Local calendar date key YYYY-MM-DD for grouping delivered orders. */
export function toLocalDayKey(date: Date): string {
  return toDateInputValue(date);
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

/** Default dashboard/report range: start of current month through today (IST calendar). */
export function defaultReportDateRange(): { from: string; to: string } {
  const todayKey = formatCalendarDateString(new Date());
  const [y, m] = todayKey.split("-").map(Number);
  return {
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: todayKey,
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
