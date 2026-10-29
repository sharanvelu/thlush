import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/services/AuthService";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const cookieStore = await cookies();
  // shadcn's sidebar remembers collapsed/expanded state in this cookie.
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AppShell user={user} defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </AppShell>
  );
}
