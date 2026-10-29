"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { isOidcEnabled } from "@/env";
import { safeRedirectPath } from "@/lib/redirect";
import * as AuditService from "@/services/AuditService";
import { getCurrentUser } from "@/services/AuthService";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  redirect: z.string().optional(),
});

export type LoginResult = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Signs in with email and password. On success Auth.js redirects (by throwing),
 * so this only ever *returns* when something went wrong.
 */
export async function loginAction(input: z.input<typeof loginSchema>): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirectPath(parsed.data.redirect),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The same message for unknown email and wrong password, on purpose.
      return { ok: false, error: "Incorrect email or password." };
    }
    throw error; // Includes the redirect signal on success.
  }

  return { ok: false, error: "Could not sign in. Please try again." };
}

/** Starts the SSO flow. Only works when OIDC is configured. */
export async function ssoLoginAction(redirect?: string): Promise<void> {
  if (!isOidcEnabled()) return;
  await signIn("oidc", { redirectTo: safeRedirectPath(redirect) });
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await AuditService.log({ userId: user.id, action: "logout", entity: "user", entityId: user.id });
  }
  await signOut({ redirectTo: "/login" });
}
