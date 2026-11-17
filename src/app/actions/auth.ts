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
 * What logging out should do about the SSO provider, for the current session: the provider's logout URL and
 * how to use it, or null when the user should only be logged out of the app (SSO is not configured, the
 * setting is "off", they did not sign in with SSO, or the provider has no logout endpoint).
 */
async function providerLogout(): Promise<{ mode: "background" | "redirect"; url: string } | null> {
  if (!isOidcEnabled()) return null;
  const { logout } = await getSettingsGroup("sso");
  if (logout === "off") return null;

  // The ID token lives only in the encrypted session cookie, so it is read from there, never from `auth()`.
  const requestHeaders = await headers();
  const baseUrl = getEnv().NEXT_PUBLIC_BASE_URL;
  const secure = (requestHeaders.get("x-forwarded-proto") ?? new URL(baseUrl).protocol.replace(":", "")) === "https";
  const token = await getToken({ req: { headers: requestHeaders }, secret: process.env.AUTH_SECRET, secureCookie: secure });
  if (token?.provider !== "oidc" || !token.idToken) return null;

  const issuer = process.env.OIDC_ISSUER;
  const endpoint = issuer ? await discoverEndSessionEndpoint(issuer) : null;
  if (!endpoint) return null;
  return {
    mode: logout,
    url: buildEndSessionUrl(endpoint, {
      idToken: token.idToken,
      // Only a redirect comes back here. In the background nothing needs to load our page.
      postLogoutRedirectUri: logout === "redirect" ? new URL("/login", baseUrl).toString() : undefined,
      clientId: process.env.OIDC_CLIENT_ID,
    }),
  };
}

export interface LogoutResult {
  /** Set when the app session has ended and the browser should now end the provider's session in a hidden frame. */
  backgroundUrl: string | null;
}

/**
 * Logs out of the app. Depending on the SSO setting it may also end the provider's session: by redirecting
 * (this action then never returns) or by handing back a URL for the browser to load in the background.
 */
export async function logoutAction(): Promise<LogoutResult> {
  const user = await getCurrentUser();
  const provider = user ? await providerLogout() : null;
  if (user) {
    await AuditService.log({
      userId: user.id,
      action: "logout",
      entity: "user",
      entityId: user.id,
      metadata: provider ? { sso: provider.mode } : undefined,
    });
  }
  if (provider?.mode === "redirect") {
    await signOut({ redirect: false });
    redirect(provider.url);
  }
  if (provider) {
    await signOut({ redirect: false });
    return { backgroundUrl: provider.url };
  }
  await signOut({ redirectTo: "/login" });
  return { backgroundUrl: null };
}
