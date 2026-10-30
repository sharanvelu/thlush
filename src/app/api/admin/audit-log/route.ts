import { buildPagination, paginated, parseQuery, withAuth } from "@/lib/api";
import { auditQuerySchema } from "@/lib/validation/audit";
import { listAuditLogs } from "@/services/AuditLogService";
import { getSettingsGroup } from "@/services/SettingsService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, auditQuerySchema);
    const { timezone } = await getSettingsGroup("locale");
    const { rows, total } = await listAuditLogs(query, timezone);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "audit.view" },
);
