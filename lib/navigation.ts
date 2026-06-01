/**
 * Central navigation config. Filter with `getVisibleNavSections(userRoles)` when
 * auth is wired; pass `null` for userRoles during development to show all items.
 */

export const NAV_ROLES = ["owner", "manager", "kitchen", "viewer"] as const;

export type NavRole = (typeof NAV_ROLES)[number];

export type NavItem = {
  href: string;
  label: string;
  roles?: NavRole[];
};

export type NavSection = {
  id: string;
  label: string;
  roles?: NavRole[];
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/reports", label: "P&L Reports", roles: ["owner", "manager", "viewer"] },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/orders", label: "Orders" },
      { href: "/orders/kitchen", label: "Kitchen display", roles: ["owner", "manager", "kitchen"] },
      { href: "/yield", label: "Yield Calculator" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { href: "/ingredients", label: "Ingredients" },
      { href: "/recipes", label: "Recipes" },
      { href: "/recipes/pricing", label: "Recipe pricing", roles: ["owner", "manager"] },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    items: [
      { href: "/inventory", label: "Stock" },
      { href: "/inventory/payables", label: "Supplier payables", roles: ["owner", "manager"] },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    roles: ["owner", "manager", "viewer"],
    items: [
      { href: "/expenses", label: "Expenses" },
      { href: "/admin/audit", label: "Audit log", roles: ["owner"] },
    ],
  },
];

export const DASHBOARD_QUICK_ACTIONS = [
  { href: "/orders/new", label: "Place order", roles: ["owner", "manager", "kitchen"] as NavRole[] },
  { href: "/inventory/purchases/new", label: "Record purchase", roles: ["owner", "manager"] as NavRole[] },
  { href: "/expenses/new", label: "Add expense", roles: ["owner", "manager"] as NavRole[] },
  { href: "/ingredients/barcodes", label: "Print barcodes", roles: ["owner", "manager"] as NavRole[] },
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
    (section) => canAccess(section.roles, userRoles) && section.items.length > 0
  );
}

export function getVisibleQuickActions(userRoles: NavRole[] | null = null) {
  return DASHBOARD_QUICK_ACTIONS.filter((item) => canAccess(item.roles, userRoles));
}

export function getActiveNavHref(pathname: string, sections: NavSection[]): string | null {
  const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const matches = hrefs.filter((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0]!;
}
