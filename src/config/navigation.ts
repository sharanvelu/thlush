import {
  Boxes,
  ChartColumn,
  History,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Truck,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { hasPermission, type Permission, type Role } from "@/config/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see the item; the matching route enforces it too. */
  permission: Permission;
  description: string;
  /** Milestone in which the real page ships (placeholder pages show this). */
  milestone: number;
  /** Extra words for the command palette search. */
  keywords?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        description: "Sales, trends and alerts at a glance.",
        milestone: 5,
        keywords: ["home", "overview"],
      },
      {
        label: "New Bill",
        href: "/billing",
        icon: ReceiptText,
        permission: "bills.create",
        description: "The point-of-sale screen for creating bills.",
        milestone: 3,
        keywords: ["pos", "billing", "sale", "checkout"],
      },
      {
        label: "Bill History",
        href: "/bills",
        icon: History,
        permission: "bills.view_own",
        description: "Search, filter, reprint and export past bills.",
        milestone: 4,
        keywords: ["invoices", "orders", "receipts"],
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        label: "Menu / Products",
        href: "/menu",
        icon: UtensilsCrossed,
        permission: "menu.view",
        description: "Items, prices, tax rates and availability.",
        milestone: 2,
        keywords: ["items", "products", "food"],
      },
      {
        label: "Categories",
        href: "/categories",
        icon: Tags,
        permission: "categories.manage",
        description: "Organise the menu and control POS ordering.",
        milestone: 2,
        keywords: ["groups"],
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Stock Overview",
        href: "/inventory",
        icon: Boxes,
        permission: "inventory.view",
        description: "Current stock, reorder levels and stock value.",
        milestone: 7,
        keywords: ["stock", "low stock"],
      },
      {
        label: "Stock Adjustments",
        href: "/inventory/adjustments",
        icon: SlidersHorizontal,
        permission: "inventory.adjust",
        description: "Add or remove stock with a recorded reason.",
        milestone: 7,
        keywords: ["wastage", "damage", "correction"],
      },
      {
        label: "Suppliers & Purchases",
        href: "/inventory/suppliers",
        icon: Truck,
        permission: "suppliers.manage",
        description: "Suppliers and purchase entries that receive stock.",
        milestone: 7,
        keywords: ["vendors", "purchase"],
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Customers",
        href: "/customers",
        icon: Users,
        permission: "customers.view",
        description: "Customer profiles, spend and bill history.",
        milestone: 6,
        keywords: ["clients", "guests"],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: ChartColumn,
        permission: "reports.view",
        description: "Sales, tax, discount and inventory reports.",
        milestone: 8,
        keywords: ["analytics", "gst", "tax report"],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Users & Roles",
        href: "/admin/users",
        icon: ShieldCheck,
        permission: "users.manage",
        description: "Create users and assign roles.",
        milestone: 6,
        keywords: ["staff", "accounts", "permissions"],
      },
      {
        label: "Audit Log",
        href: "/admin/audit-log",
        icon: ScrollText,
        permission: "audit.view",
        description: "Who did what, and when.",
        milestone: 6,
        keywords: ["activity", "history", "security"],
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "settings.manage",
        description: "Business profile, tax, receipts and features.",
        milestone: 6,
        keywords: ["configuration", "preferences"],
      },
    ],
  },
];

/** Groups and items visible to a role, with empty groups removed. */
export function navForRole(role: Role | null | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}

export function findNavItem(href: string): NavItem | undefined {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
}

/** Best match for a pathname, preferring the longest href. */
export function navItemForPath(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const matches =
        item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (!best || item.href.length > best.href.length)) best = item;
    }
  }
  return best;
}
