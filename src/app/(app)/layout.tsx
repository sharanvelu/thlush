import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { hasPermission } from "@/config/permissions";
import { requireUser } from "@/services/AuthService";
import { getSettings } from "@/services/SettingsService";
import { lowStock } from "@/services/StockService";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  const alerts = settings.features.inventory && hasPermission(user.role, "inventory.view") ? await lowStock(8) : null;
  const cookieStore = await cookies();
  // shadcn's sidebar remembers collapsed/expanded state in this cookie.
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AppShell
      user={user}
      defaultSidebarOpen={defaultSidebarOpen}
      brand={{ name: settings.business.name || "Thlush", logoUrl: settings.business.logoUrl }}
      features={{ inventory: settings.features.inventory }}
      alerts={alerts}
    >
      {children}
    </AppShell>
  );
}
