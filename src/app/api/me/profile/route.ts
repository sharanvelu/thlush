import { ok, parseBody, withAuth } from "@/lib/api";
import { profileSchema } from "@/lib/validation/user";
import * as UserService from "@/services/UserService";

/** Edits the signed-in user's own name, email and theme. Never anyone else's. */
export const PATCH = withAuth(async (req, { user }) => {
  await UserService.updateOwnProfile(user.id, await parseBody(req, profileSchema));
  return ok({ updated: true });
});
