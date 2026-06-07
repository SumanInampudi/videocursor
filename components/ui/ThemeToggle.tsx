"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

type ThemeChoice = "light" | "dark" | "system";

type ThemeToggleProps = {
  compact?: boolean;
  className?: string;
};

const OPTIONS: { value: ThemeChoice; label: string; shortLabel: string }[] = [
  { value: "light", label: "Light", shortLabel: "Light" },
  { value: "dark", label: "Dark", shortLabel: "Dark" },
  { value: "system", label: "System", shortLabel: "Auto" },
];

function ThemeIcon({ choice, resolvedDark }: { choice: ThemeChoice; resolvedDark: boolean }) {
  if (choice === "system") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (choice === "dark" || (choice === "system" && resolvedDark)) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function SegmentedThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const groupId = useId();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex h-9 rounded-lg border border-brand-200/60 bg-surface-card",
          className
        )}
        style={{ width: "9.5rem" }}
        aria-hidden
      />
    );
  }

  const active = (theme as ThemeChoice) ?? "system";

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${groupId}-label`}
      className={cn(
        "inline-flex rounded-lg border border-brand-200/60 bg-surface-card p-0.5 shadow-sm dark:border-brand-700/35",
        className
      )}
    >
      <span id={`${groupId}-label`} className="sr-only">
        Theme
      </span>
      {OPTIONS.map((option) => {
        const selected = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "inline-flex min-w-[2.75rem] items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 focus:ring-offset-background",
              selected
                ? "bg-brand-gradient text-charcoal shadow-sm"
                : "text-charcoal-muted hover:bg-brand-50 hover:text-charcoal dark:hover:bg-brand-900/30 dark:hover:text-brand-100"
            )}
            title={option.label}
          >
            <ThemeIcon choice={option.value} resolvedDark={false} />
            <span className="hidden sm:inline">{option.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

function MenuThemePicker({ compact, className }: { compact?: boolean; className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-block rounded-lg border border-brand-200/60 bg-surface-card",
          compact ? "h-8 w-8" : "h-9 w-9",
          className
        )}
        aria-hidden
      />
    );
  }

  const active = (theme as ThemeChoice) ?? "system";
  const resolvedDark = resolvedTheme === "dark";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border border-brand-200/60 bg-surface-card text-charcoal shadow-sm transition-colors",
          "hover:bg-brand-50 dark:hover:bg-brand-900/30",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-background",
          compact ? "h-8 w-8" : "h-9 w-9"
        )}
        title="Theme"
        aria-label="Choose theme"
      >
        <ThemeIcon choice={active} resolvedDark={resolvedDark} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 top-full z-50 mt-1 min-w-[8.5rem] overflow-hidden rounded-lg border border-brand-200/60 bg-surface-card py-1 shadow-card dark:border-brand-700/35"
        >
          {OPTIONS.map((option) => {
            const selected = active === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  selected
                    ? "bg-brand-50 font-semibold text-brand-900 dark:bg-brand-900/35 dark:text-brand-100"
                    : "text-charcoal hover:bg-brand-50/80 dark:hover:bg-brand-900/25"
                )}
              >
                <ThemeIcon choice={option.value} resolvedDark={resolvedDark} />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  if (compact) {
    return <MenuThemePicker compact className={className} />;
  }
  return <SegmentedThemePicker className={className} />;
}
