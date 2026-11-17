import type { NextAuthConfig } from "next-auth";
import { appConfig } from "@/config";
import { isRole } from "@/config/permissions";

/**
 * The part of the Auth.js config that is safe for the proxy: no database, no
 * password hashing. Providers and DB-backed callbacks are added in `auth.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: appConfig.sessionMaxAgeSeconds },
  providers: [],
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // A fresh sign-in (account is set only then) records how it happened. For SSO the provider's ID
      // token is kept so logout can end the provider session too.
      if (account) {
        token.provider = account.provider;
        token.idToken = account.provider === "oidc" ? (account.id_token ?? undefined) : undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      // Anything unexpected falls back to the least-privileged role.
      session.user.role = isRole(token.role) ? token.role : "billing";
      return session;
    },
  },
} satisfies NextAuthConfig;
