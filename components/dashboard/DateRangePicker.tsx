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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div>
        <label htmlFor="from" className="mb-1 block text-xs font-medium text-gray-500">
          From
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="to" className="mb-1 block text-xs font-medium text-gray-500">
          To
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={to}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" className="text-sm">
        Apply
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="text-sm"
        onClick={() => setRange(thisMonth.from, thisMonth.to)}
      >
        This month
      </Button>
      {defaultPreset === "month" && (
        <Button
          type="button"
          variant="ghost"
          className="text-sm"
          onClick={() => setRange(today, today)}
        >
          Today only
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        className="text-sm"
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
