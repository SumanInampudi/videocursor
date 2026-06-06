import type { PromotionSchedule } from "@/lib/promotion-engine/types";

function parseTimeMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function isWithinSchedule(
  schedule: PromotionSchedule | null,
  at: Date,
  timezone = "Asia/Kolkata"
): boolean {
  if (!schedule?.windows?.length) return true;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(at);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[weekday.slice(0, 3)] ?? at.getDay();
  const nowMinutes = hour * 60 + minute;

  return schedule.windows.some((window) => {
    if (!window.daysOfWeek.includes(day)) return false;
    const start = parseTimeMinutes(window.start);
    const end = parseTimeMinutes(window.end);
    if (start <= end) {
      return nowMinutes >= start && nowMinutes < end;
    }
    return nowMinutes >= start || nowMinutes < end;
  });
}

export function parseScheduleJson(raw: unknown): PromotionSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  const windows = (raw as { windows?: unknown }).windows;
  if (!Array.isArray(windows) || windows.length === 0) return null;
  return { windows: windows as PromotionSchedule["windows"] };
}
