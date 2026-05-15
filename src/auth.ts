import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {UserService} from "@/services/UserService";
import {UserRole} from "@/types/user";

export const {handlers, signIn, signOut, auth} = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        const user = await UserService.authenticateUser(email, password);

        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER,
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          role: UserRole.BILLING,
        };
      },
    },
  ],
  callbacks: {
    async signIn({user, account, profile}) {
      if (account?.provider === "authentik") {
        const {NeonService} = await import("@/services/NeonService");
        const {DatabaseService} = await import("@/services/DatabaseService");
        const sql = NeonService.getClient();
        const table = DatabaseService.table_names.users;
        const oidcData = JSON.stringify(profile);

        const existing = await sql.query(
          `SELECT * FROM ${table} WHERE email = $1`,
          [user.email]
        );

        if (existing.length === 0) {
          await sql.query(
            `INSERT INTO ${table} (id, name, email, password, role, last_login_at, oidc_data)
             VALUES ($1, $2, $3, $4, $5, now(), $6)`,
            [user.id, user.name, user.email, '', UserRole.BILLING, oidcData]
          );
        } else {
          const dbUser = existing[0] as { id: string; role: string };
          user.id = dbUser.id;
          (user as Record<string, unknown>).role = dbUser.role;
          await sql.query(
            `UPDATE ${table} SET last_login_at = now(), name = $1, oidc_data = $2 WHERE id = $3`,
            [user.name, oidcData, dbUser.id]
          );
        }
      }
      return true;
    },

    async jwt({token, user}) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string;
      }
      return token;
    },

    async session({session, token}) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
});
