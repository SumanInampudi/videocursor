"use client";

import { useEffect, useState } from "react";

/** Live elapsed milliseconds since `since` (updates every second). */
export function useElapsed(since: Date | string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);

  if (!since) return 0;
  return Math.max(0, now - new Date(since).getTime());
}
