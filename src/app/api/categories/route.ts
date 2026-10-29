import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { categoryListQuerySchema, categorySchema } from "@/lib/validation/category";
import * as CategoryService from "@/services/CategoryService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, categoryListQuerySchema);
    const { rows, total } = await CategoryService.listCategories(query);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "menu.view" },
);

export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, categorySchema);
    const category = await CategoryService.createCategory(input, user.id);
    return ok(category, { status: 201 });
  },
  { permission: "categories.manage" },
);
