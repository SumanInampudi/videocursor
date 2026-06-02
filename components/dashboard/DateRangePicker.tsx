"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { defaultReportDateRange, toDateInputValue } from "@/lib/dates";

type DateRangePickerProps = {
  from: string;
  to: string;
  actionPath?: string;
  defaultPreset?: "month" | "last3months";
};

export function DateRangePicker({
  from,
  to,
  actionPath = "/",
  defaultPreset = "month",
}: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(fromDate: string, toDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", fromDate);
    params.set("to", toDate);
    router.push(`${actionPath}?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fromVal = String(fd.get("from") || "");
    const toVal = String(fd.get("to") || "");
    if (fromVal && toVal) setRange(fromVal, toVal);
  }

  const today = toDateInputValue(new Date());
  const thisMonth = defaultReportDateRange();

  return (
    <form
      onSubmit={handleSubmit}
      className="filter-bar items-end"
    >
      <div>
        <label htmlFor="from" className="form-label mb-1.5 block text-xs">
          From
        </label>
        <input id="from" name="from" type="date" defaultValue={from} className="input-field" />
      </div>
      <div>
        <label htmlFor="to" className="form-label mb-1.5 block text-xs">
          To
        </label>
        <input id="to" name="to" type="date" defaultValue={to} className="input-field" />
      </div>
      <Button type="submit" size="sm">
        Apply
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setRange(thisMonth.from, thisMonth.to)}
      >
        This month
      </Button>
      {defaultPreset === "month" && (
        <Button
          type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRange(today, today)}
        >
          Today only
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const end = new Date();
          const start = new Date();
          if (defaultPreset === "last3months") {
            start.setMonth(start.getMonth() - 2);
            start.setDate(1);
          } else {
            start.setDate(start.getDate() - 29);
          }
          setRange(toDateInputValue(start), toDateInputValue(end));
        }}
      >
        {defaultPreset === "last3months" ? "Last 3 months" : "Last 30 days"}
      </Button>
    </form>
  );
}
