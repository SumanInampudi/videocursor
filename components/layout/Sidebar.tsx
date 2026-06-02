"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  getActiveNavHref,
  getVisibleNavSections,
  type NavRole,
} from "@/lib/navigation";
import { cn } from "@/lib/cn";

type SidebarProps = {
  userRoles?: NavRole[] | null;
};

export function Sidebar({ userRoles = null }: SidebarProps) {
  const pathname = usePathname();
  const sections = useMemo(() => getVisibleNavSections(userRoles), [userRoles]);
  const activeHref = useMemo(
    () => getActiveNavHref(pathname, sections),
    [pathname, sections]
  );

  return (
    <aside className="w-60 shrink-0 border-r border-brand-200/50 bg-white shadow-[inset_-1px_0_0_rgba(253,230,138,0.3)]">
      <nav className="flex flex-col gap-6 p-4 pt-5">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700/70">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = item.href === activeHref;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                        isActive
                          ? "bg-sidebar-active text-charcoal shadow-btn"
                          : "text-charcoal-light hover:bg-brand-50 hover:text-brand-900"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
