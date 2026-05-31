/**
 * Central navigation config. Filter with `getVisibleNavSections(userRoles)` when
 * auth is wired; pass `null` for userRoles during development to show all items.
 */

export const NAV_ROLES = ["owner", "manager", "kitchen", "viewer"] as const;

export type NavRole = (typeof NAV_ROLES)[number];

export type NavItem = {
  href: string;
  label: string;
  /** If set, item is only shown when the user has one of these roles. */
  roles?: NavRole[];
};

export type NavSection = {
  id: string;
  label: string;
  /** If set, entire section is hidden unless the user has one of these roles. */
  roles?: NavRole[];
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/reports", label: "P&L Reports" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/orders", label: "Orders" },
      { href: "/yield", label: "Yield Calculator" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { href: "/ingredients", label: "Ingredients" },
      { href: "/ingredients/barcodes", label: "Ingredient barcodes" },
      { href: "/recipes", label: "Recipes" },
      { href: "/recipes/pricing", label: "Recipe pricing" },
      { href: "/recipes/barcodes", label: "Recipe barcodes" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    items: [
      { href: "/inventory", label: "Stock" },
      { href: "/inventory/payables", label: "Supplier payables" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [{ href: "/expenses", label: "Expenses" }],
  },
  {
    id: "administration",
    label: "Administration",
    roles: ["owner"],
    items: [
      // Future: { href: "/admin/users", label: "Users & roles", roles: ["owner"] },
    ],
  },
];

function canAccess(allowedRoles: NavRole[] | undefined, userRoles: NavRole[] | null): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (userRoles === null) return true;
  return allowedRoles.some((role) => userRoles.includes(role));
}

export function getVisibleNavSections(userRoles: NavRole[] | null = null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(item.roles, userRoles)),
  })).filter(
    (section) =>
      canAccess(section.roles, userRoles) && section.items.length > 0
  );
}

/** Longest matching href wins (avoids /ingredients highlighting on /ingredients/barcodes). */
export function getActiveNavHref(pathname: string, sections: NavSection[]): string | null {
  const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const matches = hrefs.filter((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0]!;
}
