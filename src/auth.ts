import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { isOidcEnabled } from "@/env";
import * as AuditService from "@/services/AuditService";
import * as UserService from "@/services/UserService";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

function claim(profile: Record<string, unknown> | undefined, key: string): string | null {
  const value = profile?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await UserService.authenticate(parsed.data.email, parsed.data.password);
      if (!user) return null;
      await AuditService.log({
        userId: user.id,
        action: "login",
        entity: "user",
        entityId: user.id,
        metadata: { method: "password" },
      });
      return user;
    },
  }),
];

// The SSO provider exists only when the full OIDC trio is configured.
if (isOidcEnabled()) {
  providers.push({
    id: "oidc",
    name: "SSO",
    type: "oidc",
    issuer: process.env.OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "oidc") return true;

      const email = claim(profile, "email");
      if (!email) return false;
      // Refuse unverified emails so nobody can claim an existing account's address.
      if (profile?.email_verified === false) return false;

      const name = claim(profile, "name") ?? claim(profile, "preferred_username") ?? email;
      const dbUser = await UserService.upsertFromOidc({
        email,
        name,
        profile: { ...profile },
      });

      user.id = dbUser.id;
      user.name = dbUser.name;
      user.email = dbUser.email;
      user.role = dbUser.role;

      await AuditService.log({
        userId: dbUser.id,
        action: "login",
        entity: "user",
        entityId: dbUser.id,
        metadata: { method: "oidc" },
      });
      return true;
    },
  },
});
