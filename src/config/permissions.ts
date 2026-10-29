/**
 * The one place that defines who can do what.
 *
 * - `ROLE_PERMISSIONS` is the role -> permission matrix.
 * - `ROUTE_PERMISSIONS` maps URL prefixes to the permission they require.
 *
 * The proxy, API routes (via `withAuth`), server pages and the sidebar all read
 * from here. This file must stay free of server-only imports so the proxy and
 * client components can use it.
 */

export const ROLES = ["super_admin", "manager", "billing"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  billing: "Cashier",
};

export const PERMISSIONS = [
  "dashboard.view",
  "bills.create",
  "bills.view_own",
  "bills.view_all",
  "bills.void",
  "menu.view",
  "menu.manage",
  "categories.manage",
  "inventory.view",
  "inventory.adjust",
  "suppliers.manage",
  "customers.view",
  "customers.manage",
  "reports.view",
  "users.manage",
  "audit.view",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const MANAGER_EXCLUDED: readonly Permission[] = ["users.manage", "settings.manage"];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set(ALL),
  // Everything except user management and settings.
  manager: new Set(ALL.filter((p) => !MANAGER_EXCLUDED.includes(p))),
  // Cashier: dashboard, new bill, own bill history, read-only menu and customer lookup.
  billing: new Set<Permission>([
    "dashboard.view",
    "bills.create",
    "bills.view_own",
    "menu.view",
    "customers.view",
  ]),
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].has(permission) : false;
}

export function hasAnyPermission(
  role: Role | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Prefix -> required permission. `null` means "any signed-in user".
 * Matching picks the longest prefix, so more specific entries win.
 * API routes enforce method-level permissions inside `withAuth`; only the
 * admin API prefixes are gated here as a coarse first line of defence.
 */
export const ROUTE_PERMISSIONS: ReadonlyArray<readonly [prefix: string, permission: Permission | null]> = [
  ["/", "dashboard.view"],
  ["/billing", "bills.create"],
  ["/bills", "bills.view_own"],
  ["/receipt", "bills.view_own"],
  ["/menu", "menu.view"],
  ["/categories", "categories.manage"],
  ["/inventory", "inventory.view"],
  ["/inventory/adjustments", "inventory.adjust"],
  ["/inventory/suppliers", "suppliers.manage"],
  ["/customers", "customers.view"],
  ["/reports", "reports.view"],
  ["/profile", null],
  ["/forbidden", null],
  ["/admin", "users.manage"],
  ["/admin/users", "users.manage"],
  ["/admin/audit-log", "audit.view"],
  ["/admin/settings", "settings.manage"],
  ["/api/me", null],
  ["/api/admin", "users.manage"],
  ["/api/admin/users", "users.manage"],
  ["/api/admin/audit-log", "audit.view"],
  ["/api/admin/settings", "settings.manage"],
];

const SORTED_ROUTES = [...ROUTE_PERMISSIONS].sort((a, b) => b[0].length - a[0].length);

/**
 * Returns the permission required for a path, `null` when any signed-in user may
 * access it, or `undefined` when the path is not covered by the map.
 */
export function permissionForPath(pathname: string): Permission | null | undefined {
  for (const [prefix, permission] of SORTED_ROUTES) {
    const matches =
      prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches) return permission;
  }
  return undefined;
}

/** True when `role` may open `pathname`. Unmapped paths are allowed for signed-in users. */
export function canAccessPath(role: Role | null | undefined, pathname: string): boolean {
  const required = permissionForPath(pathname);
  if (required === undefined || required === null) return Boolean(role);
  return hasPermission(role, required);
}
