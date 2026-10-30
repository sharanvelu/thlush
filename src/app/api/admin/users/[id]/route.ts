import { z } from "zod";
import { ok, parseBody, withAuth } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { updateUserSchema } from "@/lib/validation/user";
import * as UserAdminService from "@/services/UserAdminService";

type Params = { id: string };

/** Accounts are keyed by uuid; anything else is simply not found. */
function parseUserId(raw: string | string[] | undefined): string {
  const parsed = z.string().uuid().safeParse(raw);
  if (!parsed.success) throw HttpError.notFound("User not found.");
  return parsed.data;
}

export const GET = withAuth<Params>(async (_req, { params }) => ok(await UserAdminService.getUserDetail(parseUserId(params.id))), {
  permission: "users.manage",
});

export const PATCH = withAuth<Params>(
  async (req, { user, params }) => ok(await UserAdminService.updateUser(parseUserId(params.id), await parseBody(req, updateUserSchema), user)),
  { permission: "users.manage" },
);

export const DELETE = withAuth<Params>(
  async (_req, { user, params }) => {
    await UserAdminService.deleteUser(parseUserId(params.id), user);
    return ok({ deleted: true });
  },
  { permission: "users.manage" },
);
