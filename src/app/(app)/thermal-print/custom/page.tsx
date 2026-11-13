import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { CustomPrintEditor } from "@/components/thermal-print/custom-print-editor";
import { PAGE_COPY } from "@/config/page-copy";
import { requireAccess } from "@/services/AuthService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Custom Print" };

export default async function CustomPrintPage() {
  const { allowed } = await requireAccess("print.custom");
  if (!allowed) return <Forbidden />;

  const settings = await getSettings();
  return (
    <>
      <PageHeader {...PAGE_COPY.customPrint} />
      <CustomPrintEditor paperSize={settings.receipt.paperSize} />
    </>
  );
}
