import { ok, parseBody, parseId, withAuth } from "@/lib/api";
import { categoryPatchSchema } from "@/lib/validation/category";
import * as CategoryService from "@/services/CategoryService";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }) => ok(await CategoryService.getCategory(parseId(params.id))),
  { permission: "menu.view" },
);

export const PATCH = withAuth<Params>(
  async (req, { user, params }) => {
    const patch = await parseBody(req, categoryPatchSchema);
    return ok(await CategoryService.updateCategory(parseId(params.id), patch, user.id));
  },
  { permission: "categories.manage" },
);

export const DELETE = withAuth<Params>(
  async (_req, { user, params }) => {
    await CategoryService.deleteCategory(parseId(params.id), user.id);
    return ok({ deleted: true });
  },
  { permission: "categories.manage" },
);
