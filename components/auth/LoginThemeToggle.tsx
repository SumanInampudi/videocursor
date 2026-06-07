"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function LoginThemeToggle() {
  return (
    <div className="fixed right-4 top-4 z-50 safe-area-top">
      <ThemeToggle />
    </div>
  );
}
