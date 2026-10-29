"use client";

import { ChevronsUpDown, LogOut, Palette, Store, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { RoleBadge } from "@/components/layout/role-badge";
import { ThemeDropdown } from "@/components/theme/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { appConfig } from "@/config";
import { navForRole, navItemForPath } from "@/config/navigation";
import type { SessionUser } from "@/types/user";

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const groups = navForRole(user.role);
  // The single best match, so "/inventory" is not also active on "/inventory/adjustments".
  const activeHref = navItemForPath(pathname)?.href;

  const closeDrawer = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" aria-label="Main navigation">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={appConfig.appName}>
              <Link href="/" onClick={closeDrawer}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="size-4" aria-hidden />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">{appConfig.appName}</span>
                  <span className="truncate text-xs text-muted-foreground">Billing &amp; POS</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link
                        href={item.href}
                        onClick={closeDrawer}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile" isActive={pathname === "/profile"}>
              <Link href="/profile" onClick={closeDrawer}>
                <UserIcon aria-hidden />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{user.name}</span>
                  <RoleBadge role={user.role} className="shrink-0 group-data-[collapsible=icon]:hidden" />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <ThemeDropdown side={isMobile ? "top" : "right"} align="end">
              <SidebarMenuButton tooltip="Theme">
                <Palette aria-hidden />
                <span>Theme</span>
                <ChevronsUpDown className="ml-auto size-4 opacity-60" aria-hidden />
              </SidebarMenuButton>
            </ThemeDropdown>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <form action={logoutAction}>
              <SidebarMenuButton type="submit" tooltip="Log out">
                <LogOut aria-hidden />
                <span>Log out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
