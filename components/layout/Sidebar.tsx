"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "P&L Reports" },
  { href: "/orders", label: "Orders" },
  { href: "/expenses", label: "Expenses" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/inventory", label: "Inventory" },
  { href: "/inventory/payables", label: "Supplier payables" },
  { href: "/recipes", label: "Recipes" },
  { href: "/recipes/barcodes", label: "Recipe barcodes" },
  { href: "/yield", label: "Yield Calculator" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-servora-yellow text-white"
                  : "text-servora-charcoal hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
