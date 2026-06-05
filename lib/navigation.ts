/**
 * Central navigation config. Filter with `getVisibleNavSections(userRoles)` when
 * auth is wired; pass `null` for userRoles during development to show all items.
 */

export const NAV_ROLES = ["owner", "manager", "pos", "kitchen", "viewer"] as const;

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
    roles: ["owner", "manager", "viewer"],
    items: [
      { href: "/", label: "Dashboard", roles: ["owner", "manager", "viewer"] },
      { href: "/reports", label: "P&L Reports", roles: ["owner", "manager", "viewer"] },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    roles: ["owner", "manager", "pos", "kitchen"],
    items: [
      { href: "/orders", label: "Orders", roles: ["owner", "manager"] },
      { href: "/orders/pos", label: "POS register", roles: ["owner", "manager", "pos"] },
      { href: "/orders/kitchen", label: "Kitchen display", roles: ["owner", "manager", "kitchen"] },
      { href: "/queue", label: "Customer queue display", roles: ["owner", "manager"] },
      { href: "/customers", label: "Customers", roles: ["owner", "manager"] },
      { href: "/discounts", label: "Discounts", roles: ["owner", "manager"] },
      { href: "/yield", label: "Yield Calculator", roles: ["owner", "manager"] },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    roles: ["owner", "manager"],
    items: [
      { href: "/raw-materials", label: "Raw Materials" },
      { href: "/products", label: "Products" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    roles: ["owner", "manager"],
    items: [
      { href: "/inventory", label: "Stock" },
      { href: "/suppliers", label: "Suppliers" },
      { href: "/inventory/payables", label: "Supplier payables" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    roles: ["owner", "manager", "viewer"],
    items: [
      { href: "/expenses", label: "Expenses" },
      { href: "/admin/business", label: "Businesses", roles: ["owner"] },
      { href: "/admin/audit", label: "Audit log", roles: ["owner"] },
      { href: "/admin/data", label: "Import / export data", roles: ["owner"] },
      { href: "/admin/users", label: "Team & roles", roles: ["owner"] },
    ],
  },
];

export const DASHBOARD_QUICK_ACTIONS = [
  { href: "/orders/pos", label: "POS register", roles: ["owner", "manager", "pos"] as NavRole[] },
  { href: "/orders/kitchen", label: "Kitchen display", roles: ["owner", "manager", "kitchen"] as NavRole[] },
  { href: "/orders/new", label: "Simple order form", roles: ["owner", "manager"] as NavRole[] },
  { href: "/inventory/receive", label: "Stock receive", roles: ["owner", "manager"] as NavRole[] },
  { href: "/expenses/new", label: "Add expense", roles: ["owner", "manager"] as NavRole[] },
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
