import type { Metadata } from "next";
import { UsersView } from "@/components/admin/users-view";
import { Forbidden } from "@/components/layout/forbidden";
import { userListQuerySchema } from "@/lib/validation/user";
import { requireAccess } from "@/services/AuthService";
import { getSettingsGroup } from "@/services/SettingsService";
import { listUsers } from "@/services/UserAdminService";

export const metadata: Metadata = { title: "Users & Roles" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const { user, allowed } = await requireAccess("users.manage");
  if (!allowed) return <Forbidden />;

  const raw = await searchParams;
  const query = userListQuerySchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const [{ rows, total }, locale] = await Promise.all([listUsers(query), getSettingsGroup("locale")]);
  return <UsersView rows={rows} total={total} query={query} currentUserId={user.id} settings={locale} />;
}
