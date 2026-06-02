"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";

type LiveSearchBarProps = {
  paramKey?: string;
  placeholder: string;
  debounceMs?: number;
  className?: string;
};

export function LiveSearchBar({
  paramKey = "q",
  placeholder,
  debounceMs = 250,
  className = "",
}: LiveSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramKey) ?? "");

  useEffect(() => {
    setValue(searchParams.get(paramKey) ?? "");
  }, [searchParams, paramKey]);

  useEffect(() => {
    const current = searchParams.get(paramKey) ?? "";
    if (value === current) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set(paramKey, trimmed);
      else params.delete(paramKey);
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [value, searchParams, paramKey, pathname, router, debounceMs]);

  return (
    <SmartSearchInput
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}

