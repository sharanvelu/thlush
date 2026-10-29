import { ok, parseBody, withAuth } from "@/lib/api";
import { menuBulkSchema } from "@/lib/validation/menu";
import * as MenuService from "@/services/MenuService";

export const POST = withAuth(
  async (req, { user }) => ok(await MenuService.bulkUpdateMenuItems(await parseBody(req, menuBulkSchema), user.id)),
  { permission: "menu.manage" },
);
