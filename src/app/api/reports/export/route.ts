import { parseQuery, withAuth } from "@/lib/api";
import { resolveRange } from "@/lib/dashboard";
import { REPORT_META, exportFileName, reportExportQuerySchema, reportToCsv } from "@/lib/reports";
import { getSettings } from "@/services/SettingsService";
import { getReport } from "@/services/ReportService";
import { reportToPdf } from "@/services/ReportPdf";
import { HttpError } from "@/lib/errors";

/** The report on screen as CSV or PDF. Takes the same query as the page. */
export const GET = withAuth(
  async (req) => {
    const { format, r, range: rangeKey, from, to, group } = parseQuery(req, reportExportQuerySchema);
    const settings = await getSettings();
    if (REPORT_META[r].needsInventory && !settings.features.inventory) throw HttpError.badRequest("Inventory is turned off.");

    const { timezone, locale, currency } = settings.locale;
    const range = resolveRange(rangeKey ?? "30d", from, to, timezone);
    const report = await getReport(r, { range, group, timeZone: timezone, locale });
    const name = exportFileName(r, REPORT_META[r].usesRange ? range.from : null, REPORT_META[r].usesRange ? range.to : null, format);
    const headers = { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${name}"` };

    if (format === "pdf") {
      const body = await reportToPdf(report, {
        businessName: settings.business.name || "Thlush",
        currency,
        locale,
        generatedAt: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date()),
      });
      return new Response(new Uint8Array(body), { headers: { ...headers, "Content-Type": "application/pdf" } });
    }
    return new Response(reportToCsv(report), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  },
  { permission: "reports.view" },
);
