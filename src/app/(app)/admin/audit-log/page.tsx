import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { AuditFilters } from "@/components/admin/audit-filters";
import { AuditTable } from "@/components/admin/audit-table";
import { EmptyState } from "@/components/layout/empty-state";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { auditQuerySchema } from "@/lib/validation/audit";
import { listAuditEntities, listAuditLogs } from "@/services/AuditLogService";
import { requireAccess } from "@/services/AuthService";
import { getSettingsGroup } from "@/services/SettingsService";
import { listUserOptions } from "@/services/UserService";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const { allowed } = await requireAccess("audit.view");
  if (!allowed) return <Forbidden />;

  const raw = await searchParams;
  const query = auditQuerySchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const locale = await getSettingsGroup("locale");
  const [{ rows, total }, users, entities] = await Promise.all([listAuditLogs(query, locale.timezone), listUserOptions(), listAuditEntities()]);

  return (
    <>
      <PageHeader title="Audit Log" description="Who did what, and when. Entries can't be edited or removed from here." />
      <AuditFilters key={JSON.stringify([query.user, query.entity, query.action, query.from, query.to])} query={query} users={users} entities={entities} total={total} />
      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nothing to show" description="No activity matches these filters." />
      ) : (
        <AuditTable rows={rows} locale={locale.locale} timeZone={locale.timezone} />
      )}
    </>
  );
}
