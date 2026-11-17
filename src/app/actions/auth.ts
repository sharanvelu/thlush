"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { getEnv, isOidcEnabled } from "@/env";
import { buildEndSessionUrl, discoverEndSessionEndpoint } from "@/lib/oidc-logout";
import { safeRedirectPath } from "@/lib/redirect";
import * as AuditService from "@/services/AuditService";
import { getCurrentUser } from "@/services/AuthService";
import { getSettingsGroup } from "@/services/SettingsService";

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

/**
 * The SSO provider's logout URL for the current session, or null when the user should only be logged out of the
 * app: SSO is not configured, the setting is off, they did not sign in with SSO, or the provider has no logout
 * endpoint (then logging out of the app still works).
 */
async function providerLogoutUrl(): Promise<string | null> {
  if (!isOidcEnabled()) return null;
  const { logoutFromProvider } = await getSettingsGroup("sso");
  if (!logoutFromProvider) return null;

  // The ID token lives only in the encrypted session cookie, so it is read from there, never from `auth()`.
  const requestHeaders = await headers();
  const secure = (requestHeaders.get("x-forwarded-proto") ?? new URL(getEnv().NEXT_PUBLIC_BASE_URL).protocol.replace(":", "")) === "https";
  const token = await getToken({ req: { headers: requestHeaders }, secret: process.env.AUTH_SECRET, secureCookie: secure });
  if (token?.provider !== "oidc" || !token.idToken) return null;

  const issuer = process.env.OIDC_ISSUER;
  const endpoint = issuer ? await discoverEndSessionEndpoint(issuer) : null;
  if (!endpoint) return null;
  return buildEndSessionUrl(endpoint, {
    idToken: token.idToken,
    postLogoutRedirectUri: new URL("/login", getEnv().NEXT_PUBLIC_BASE_URL).toString(),
    clientId: process.env.OIDC_CLIENT_ID,
  });
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  const providerUrl = user ? await providerLogoutUrl() : null;
  if (user) {
    await AuditService.log({
      userId: user.id,
      action: "logout",
      entity: "user",
      entityId: user.id,
      metadata: providerUrl ? { sso: true } : undefined,
    });
  }
  if (providerUrl) {
    // End the app session, then send the browser to the provider to end its session and bring them back.
    await signOut({ redirect: false });
    redirect(providerUrl);
  }
  await signOut({ redirectTo: "/login" });
}
