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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
