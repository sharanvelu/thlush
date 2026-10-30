import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { ReportsView } from "@/components/reports/reports-view";
import { resolveRange } from "@/lib/dashboard";
import { todayIn } from "@/lib/dates";
import { REPORT_KINDS, REPORT_META, reportQuerySchema } from "@/lib/reports";
import { requireAccess } from "@/services/AuthService";
import { getReport } from "@/services/ReportService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { allowed } = await requireAccess("reports.view");
  if (!allowed) return <Forbidden />;

  const settings = await getSettings();
  const { timezone, locale, currency } = settings.locale;
  const raw = await searchParams;
  const query = reportQuerySchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));

  const kinds = REPORT_KINDS.filter((k) => settings.features.inventory || !REPORT_META[k].needsInventory);
  const kind = kinds.includes(query.r) ? query.r : "sales";
  // Reports look at a month by default; a day is too little to read a trend from.
  const range = resolveRange(query.range ?? "30d", query.from, query.to, timezone);
  const report = await getReport(kind, { range, group: query.group, timeZone: timezone, locale });

  return <ReportsView report={report} kinds={kinds} group={query.group} range={range} today={todayIn(timezone)} settings={{ currency, locale }} />;
}
