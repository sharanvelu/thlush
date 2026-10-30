import { ok, parseBody, withAuth } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation/user";
import * as UserService from "@/services/UserService";

export const POST = withAuth(async (req, { user }) => {
  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
  await UserService.changeOwnPassword(user.id, currentPassword, newPassword);
  return ok({ changed: true });
});
