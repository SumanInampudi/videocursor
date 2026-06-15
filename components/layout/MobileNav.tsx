"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getActiveNavHref,
  getVisibleNavSections,
  type NavRole,
} from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export function MobileNav({ userRoles = null }: { userRoles?: NavRole[] | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sections = useMemo(() => getVisibleNavSections(userRoles), [userRoles]);
  const activeHref = useMemo(
    () => getActiveNavHref(pathname, sections),
    [pathname, sections]
  );

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-3 top-[4.5rem] z-50 shadow-card"
        aria-expanded={open}
      >
        Menu
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed left-0 top-[4.25rem] z-50 h-[calc(100dvh-4.25rem)] w-72 overflow-y-auto border-r border-brand-200 bg-surface-card p-4 shadow-card-hover dark:border-brand-700/30">
            <div className="mb-3 h-1 rounded-full bg-brand-gradient" aria-hidden />
            {sections.map((section) => (
              <div key={section.id} className="mb-5">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-brand-700/70">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                          item.href === activeHref
                            ? "bg-sidebar-active text-charcoal shadow-btn"
                            : "text-charcoal hover:bg-brand-50 dark:hover:bg-brand-900/25"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
