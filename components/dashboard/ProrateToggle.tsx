"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ProrateToggle({
  enabled,
  actionPath = "/",
}: {
  enabled: boolean;
  actionPath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (enabled) {
      params.delete("prorate");
    } else {
      params.set("prorate", "1");
    }
    router.push(`${actionPath}?${params.toString()}`);
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={enabled}
        onChange={toggle}
        className="rounded border-gray-300 text-servora-yellow focus:ring-servora-yellow"
      />
      Prorate monthly expenses to days in range
    </label>
  );
}
