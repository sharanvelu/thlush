import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { createUserSchema, userListQuerySchema } from "@/lib/validation/user";
import * as UserAdminService from "@/services/UserAdminService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, userListQuerySchema);
    const { rows, total } = await UserAdminService.listUsers(query);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "users.manage" },
);

export const POST = withAuth(
  async (req, { user }) => ok(await UserAdminService.createUser(await parseBody(req, createUserSchema), user), { status: 201 }),
  { permission: "users.manage" },
);
