import { ok, parseId, withAuth } from "@/lib/api";
import * as MenuService from "@/services/MenuService";

export const POST = withAuth<{ id: string }>(
  async (_req, { user, params }) => ok(await MenuService.duplicateMenuItem(parseId(params.id), user.id), { status: 201 }),
  { permission: "menu.manage" },
);
