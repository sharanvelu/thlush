import { parseQuery, withAuth } from "@/lib/api";
import { menuListQuerySchema } from "@/lib/validation/menu";
import * as MenuService from "@/services/MenuService";

/** CSV of the items matching the same filters as the list. */
export const GET = withAuth(
  async (req) => {
    const { q, category, status } = parseQuery(req, menuListQuerySchema);
    const csv = await MenuService.exportMenuCsv({ q, category, status });
    const day = new Date().toISOString().slice(0, 10);
    return new Response(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="menu-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { permission: "menu.view" },
);
