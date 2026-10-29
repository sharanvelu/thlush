import { FolderPlus, History, PackagePlus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/layout/forbidden";
import { Greeting } from "@/components/dashboard/greeting";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission, type Permission } from "@/config/permissions";
import { requireAccess } from "@/services/AuthService";

export const metadata: Metadata = { title: "Dashboard" };

const KPIS = ["Bills", "Revenue", "Average order value", "Items sold"] as const;

const QUICK_ACTIONS: Array<{
  label: string;
  hint: string;
  href: string;
  icon: typeof ReceiptText;
  permission: Permission;
}> = [
  { label: "New Bill", hint: "Open the POS", href: "/billing", icon: ReceiptText, permission: "bills.create" },
  { label: "Add Menu Item", hint: "Create a product", href: "/menu?new=1", icon: PackagePlus, permission: "menu.manage" },
  { label: "Add Category", hint: "Organise the menu", href: "/categories?new=1", icon: FolderPlus, permission: "categories.manage" },
  { label: "View History", hint: "Past bills", href: "/bills", icon: History, permission: "bills.view_own" },
];

export default async function DashboardPage() {
  const { user, allowed } = await requireAccess("dashboard.view");
  if (!allowed) return <Forbidden />;

  const actions = QUICK_ACTIONS.filter((a) => hasPermission(user.role, a.permission));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Greeting name={user.name} />
        <RangeSelector />
      </div>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key figures
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((label) => (
            <Card key={label} className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Live figures, trends and charts arrive in milestone 5.
        </p>
      </section>

      {actions.length > 0 ? (
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map(({ label, hint, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
