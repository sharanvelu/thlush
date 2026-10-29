import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { SessionUser } from "@/types/user";

interface AppShellProps {
  user: SessionUser;
  defaultSidebarOpen: boolean;
  children: ReactNode;
}

/** Sidebar + top bar + content area. On phones the sidebar becomes a drawer. */
export function AppShell({ user, defaultSidebarOpen, children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppSidebar user={user} />
      <SidebarInset>
        <TopBar user={user} />
        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
