import { ok, parseBody, parseId, withAuth } from "@/lib/api";
import { menuItemPatchSchema } from "@/lib/validation/menu";
import * as MenuService from "@/services/MenuService";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }) => ok(await MenuService.getMenuItem(parseId(params.id))),
  { permission: "menu.view" },
);

export const PATCH = withAuth<Params>(
  async (req, { user, params }) => {
    const patch = await parseBody(req, menuItemPatchSchema);
    return ok(await MenuService.updateMenuItem(parseId(params.id), patch, user.id));
  },
  { permission: "menu.manage" },
);

export const DELETE = withAuth<Params>(
  async (_req, { user, params }) => ok(await MenuService.deleteMenuItem(parseId(params.id), user.id)),
  { permission: "menu.manage" },
);
