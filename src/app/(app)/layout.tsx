import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/services/AuthService";
import { getSettings } from "@/services/SettingsService";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  const cookieStore = await cookies();
  // shadcn's sidebar remembers collapsed/expanded state in this cookie.
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AppShell
      user={user}
      defaultSidebarOpen={defaultSidebarOpen}
      brand={{ name: settings.business.name || "Thlush", logoUrl: settings.business.logoUrl }}
      features={{ inventory: settings.features.inventory }}
    >
      {children}
    </AppShell>
  );
}
