"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getActiveNavHref,
  getVisibleNavSections,
  type NavRole,
} from "@/lib/navigation";

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-3 top-[4.25rem] z-50 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm"
        aria-expanded={open}
      >
        Menu
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-gray-200 bg-white p-4 shadow-lg">
            {sections.map((section) => (
              <div key={section.id} className="mb-4">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase text-gray-400">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`block rounded-md px-3 py-2 text-sm ${
                          item.href === activeHref
                            ? "bg-servora-yellow text-white"
                            : "text-servora-charcoal hover:bg-gray-100"
                        }`}
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
