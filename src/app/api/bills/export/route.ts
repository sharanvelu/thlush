import { parseQuery, withAuth } from "@/lib/api";
import { buildExportRows } from "@/lib/bill-export";
import { billExportQuerySchema } from "@/lib/validation/bill-history";
import { toXlsx } from "@/services/BillExport";
import * as BillHistoryService from "@/services/BillHistoryService";
import { toCsv } from "@/lib/csv";
import { EXPORT_HEADER } from "@/lib/bill-export";
import { getSettings } from "@/services/SettingsService";

/** CSV or XLSX of the bills matching the same filters as the list (one row per bill line). */
export const GET = withAuth(
  async (req, { user }) => {
    const { format, ...filters } = parseQuery(req, billExportQuerySchema);
    const settings = await getSettings();
    const { bills, truncated } = await BillHistoryService.listBillsForExport(filters, user, settings.locale.timezone);
    const rows = buildExportRows(bills, {
      timeZone: settings.locale.timezone,
      locale: settings.locale.locale,
      walkInLabel: settings.billing.defaultCustomerName || "Walk-in Customer",
    });
    const day = new Date().toISOString().slice(0, 10);
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="bills-${day}.${format}"`,
      "X-Export-Truncated": truncated ? "true" : "false",
    };

    if (format === "xlsx") {
      const body = await toXlsx(rows);
      return new Response(new Uint8Array(body), {
        headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      });
    }
    return new Response(`﻿${toCsv([[...EXPORT_HEADER], ...rows])}`, {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  },
  { anyOf: ["bills.view_own", "bills.view_all"] },
);
