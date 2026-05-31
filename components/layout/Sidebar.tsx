"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  getActiveNavHref,
  getVisibleNavSections,
  type NavRole,
} from "@/lib/navigation";

type SidebarProps = {
  /**
   * When auth is added, pass the signed-in user's roles from the session.
   * `null` = development mode (show all items, including role-gated ones).
   */
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
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
      <nav className="flex flex-col gap-5 p-4">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = item.href === activeHref;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-servora-yellow text-white"
                          : "text-servora-charcoal hover:bg-gray-100"
                      }`}
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
