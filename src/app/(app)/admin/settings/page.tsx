import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsView } from "@/components/settings/settings-view";
import { requireAccess } from "@/services/AuthService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { allowed } = await requireAccess("settings.manage");
  if (!allowed) return <Forbidden />;
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Business details, tax, receipts and what's switched on." />
      <SettingsView settings={settings} />
    </>
  );
}
