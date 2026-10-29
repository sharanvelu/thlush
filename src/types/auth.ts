import type { DefaultSession } from "next-auth";
import type { Role } from "@/config/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

// `next-auth/jwt` re-exports this interface, so augmenting the source module covers both.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}
