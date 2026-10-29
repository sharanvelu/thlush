import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasAnyPermission, hasPermission, type Permission } from "@/config/permissions";
import * as UserService from "@/services/UserService";
import type { SessionUser } from "@/types/user";

/**
 * The signed-in user, with identity and role re-read from the database so that
 * deleted users and changed roles take effect on the very next request.
 * Returns null when there is no valid session or the user no longer exists.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return UserService.findSessionUser(id);
});

/** For server components and layouts: redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export interface AccessResult {
  user: SessionUser;
  allowed: boolean;
}

/**
 * For server pages. Redirects when signed out; otherwise reports whether the
 * user holds the permission so the page can render the forbidden state.
 */
export async function requireAccess(permission: Permission): Promise<AccessResult> {
  const user = await requireUser();
  return { user, allowed: hasPermission(user.role, permission) };
}

export function userHasAny(user: SessionUser, permissions: readonly Permission[]): boolean {
  return hasAnyPermission(user.role, permissions);
}
