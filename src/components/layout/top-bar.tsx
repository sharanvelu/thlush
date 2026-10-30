"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import type { LowStockAlerts } from "@/services/StockService";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NAV_GROUPS, navItemForPath } from "@/config/navigation";
import { hasPermission } from "@/config/permissions";
import type { SessionUser } from "@/types/user";

function useBreadcrumb(pathname: string): { group: string | null; page: string } {
  const item = navItemForPath(pathname);
  if (item) {
    const group = NAV_GROUPS.find((g) => g.items.some((i) => i.href === item.href));
    return { group: group?.label ?? null, page: item.label };
  }
  if (pathname.startsWith("/profile")) return { group: "Account", page: "Profile" };
  return { group: null, page: "" };
}

export function TopBar({ user, features, alerts }: { user: SessionUser; features: { inventory: boolean }; alerts: LowStockAlerts | null }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const { group, page } = useBreadcrumb(pathname);
  const canBill = hasPermission(user.role, "bills.create");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-4">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-1 hidden h-5 sm:block" />

      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList>
          {group ? (
            <>
              <BreadcrumbItem className="text-muted-foreground">{group}</BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          ) : null}
          <BreadcrumbItem>
            <BreadcrumbPage>{page}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          className="hidden h-9 w-56 justify-start gap-2 px-3 font-normal text-muted-foreground lg:flex"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search pages and actions"
        >
          <Search className="size-4" aria-hidden />
          <span>Search...</span>
          <kbd className="pointer-events-none ml-auto rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search pages and actions"
        >
          <Search className="size-4" aria-hidden />
        </Button>

        {canBill ? (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/billing">
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">New Bill</span>
              <span className="sr-only sm:hidden">New Bill</span>
            </Link>
          </Button>
        ) : null}

        <ThemeToggle />
        <NotificationsBell alerts={alerts} />
        <UserMenu user={user} />
      </div>

      <CommandPalette role={user.role} features={features} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
