"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navForRole, navItemForPath } from "@/config/navigation";
import type { SessionUser } from "@/types/user";

export interface Brand {
  name: string;
  logoUrl: string | null;
}

export function AppSidebar({ user, brand, features }: { user: SessionUser; brand: Brand; features: { inventory: boolean } }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const groups = navForRole(user.role, features);
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
            <SidebarMenuButton size="lg" asChild tooltip={brand.name}>
              <Link href="/" onClick={closeDrawer}>
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a small logo saved in settings
                  <img src={brand.logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Store className="size-4" aria-hidden />
                  </div>
                )}
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">{brand.name}</span>
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

      <SidebarRail />
    </Sidebar>
  );
}
