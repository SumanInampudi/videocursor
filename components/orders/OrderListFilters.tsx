"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ORDER_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/pos-payment";
import { OrderStatus } from "@prisma/client";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: OrderStatus.NEW, label: "New" },
  { value: OrderStatus.PROCESSING, label: "Processing" },
  { value: OrderStatus.PACKING, label: "Packing" },
  { value: OrderStatus.READY, label: "Ready" },
  { value: OrderStatus.DELIVERED, label: "Delivered" },
  { value: OrderStatus.CANCELLED, label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Any payment" },
  { value: "unpaid", label: "Unpaid" },
  ...ORDER_PAYMENT_METHODS.map((m) => ({
    value: m,
    label: PAYMENT_METHOD_LABELS[m],
  })),
];

export function OrderListFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if (resetPage) {
        params.delete("page");
      }
      const qs = params.toString();
      router.push(qs ? `/orders?${qs}` : "/orders");
    },
    [router, searchParams]
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (searchInput === current) return;

    const timer = window.setTimeout(() => {
      pushParams({ q: searchInput.trim() || undefined });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput, searchParams, pushParams]);

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
  }, [searchParams]);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="min-w-[200px] flex-1">
        <Input
          label="Search"
          placeholder="Order #, customer, item, promo code…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <div className="w-44">
        <Select
          label="Status"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => pushParams({ status: e.target.value || undefined })}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="w-40">
        <Select
          label="Payment"
          value={searchParams.get("payment") ?? ""}
          onChange={(e) => pushParams({ payment: e.target.value || undefined })}
          options={PAYMENT_OPTIONS}
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-servora-charcoal">
        <input
          type="checkbox"
          checked={searchParams.get("today") === "1"}
          onChange={(e) => pushParams({ today: e.target.checked ? "1" : undefined })}
          className="h-4 w-4 rounded border-gray-300 text-servora-yellow focus:ring-servora-yellow"
        />
        Today only
      </label>
      {(searchParams.get("q") ||
        searchParams.get("status") ||
        searchParams.get("payment") ||
        searchParams.get("today") ||
        searchParams.get("page")) && (
        <button
          type="button"
          className="pb-2 text-sm text-servora-yellow hover:underline"
          onClick={() => router.push("/orders")}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
