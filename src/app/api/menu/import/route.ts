import { ok, parseBody, withAuth } from "@/lib/api";
import { menuImportSchema } from "@/lib/validation/menu";
import * as MenuService from "@/services/MenuService";

/** `dryRun: true` validates and previews; `dryRun: false` writes everything or nothing. */
export const POST = withAuth(
  async (req, { user }) => {
    const { csv, dryRun } = await parseBody(req, menuImportSchema);
    return ok(await MenuService.importMenuCsv(csv, { dryRun, userId: user.id }));
  },
  { permission: "menu.manage" },
);
