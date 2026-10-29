import { ok, parseBody, withAuth } from "@/lib/api";
import { categoryReorderSchema } from "@/lib/validation/category";
import * as CategoryService from "@/services/CategoryService";

export const POST = withAuth(
  async (req, { user }) => {
    const { ids } = await parseBody(req, categoryReorderSchema);
    await CategoryService.reorderCategories(ids, user.id);
    return ok({ reordered: ids.length });
  },
  { permission: "categories.manage" },
);
