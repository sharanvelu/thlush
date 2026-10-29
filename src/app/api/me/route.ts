import { ok, withAuth } from "@/lib/api";

/** The signed-in user. Any authenticated role may call this. */
export const GET = withAuth(async (_req, { user }) => ok(user));
