import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { menuItemSchema, menuListQuerySchema } from "@/lib/validation/menu";
import * as MenuService from "@/services/MenuService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, menuListQuerySchema);
    const { rows, total } = await MenuService.listMenuItems(query);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "menu.view" },
);

export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, menuItemSchema);
    return ok(await MenuService.createMenuItem(input, user.id), { status: 201 });
  },
  { permission: "menu.manage" },
);
