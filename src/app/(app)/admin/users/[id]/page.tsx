import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AuditTable } from "@/components/admin/audit-table";
import { UserActions } from "@/components/admin/user-actions";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { RoleBadge } from "@/components/layout/role-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HttpError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { listAuditLogs } from "@/services/AuditLogService";
import { requireAccess } from "@/services/AuthService";
import { getSettings } from "@/services/SettingsService";
import { getUserDetail } from "@/services/UserAdminService";

export const metadata: Metadata = { title: "User" };

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { user: viewer, allowed } = await requireAccess("users.manage");
  if (!allowed) return <Forbidden />;

  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await getUserDetail(id.data).catch((e: unknown) => {
    if (e instanceof HttpError && e.status === 404) return null;
    throw e;
  });
  if (!detail) notFound();

  const settings = await getSettings();
  const { locale, timezone, currency } = settings.locale;
  const activity = await listAuditLogs({ user: detail.id, page: 1, pageSize: 15 }, timezone);
  const fmt = { locale, timeZone: timezone };

  const stats: Array<[string, string]> = [
    ["Bills rung up", String(detail.bills)],
    ["Revenue", formatMoney(detail.revenue, { currency, locale })],
    ["Last sign-in", detail.lastLoginAt ? formatDateTime(detail.lastLoginAt, fmt) : "Never"],
  ];

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/users" className="text-muted-foreground underline-offset-4 hover:underline">← All users</Link>
      </p>
      <PageHeader title={detail.name} description={detail.email} actions={<UserActions user={detail} currentUserId={viewer.id} />} />

      <section aria-label="Statistics" className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <Card key={label} className="shadow-card">
            <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent><p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p></CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="h-fit shadow-card">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Role</dt><dd><RoleBadge role={detail.role} /></dd>
              <dt className="text-muted-foreground">Email</dt><dd className="min-w-0 break-words">{detail.email}</dd>
              <dt className="text-muted-foreground">Sign-in</dt><dd>{detail.hasPassword ? "Email and password" : "Single sign-on"}</dd>
              <dt className="text-muted-foreground">Created</dt><dd>{formatDate(detail.createdAt, fmt)}</dd>
            </dl>
          </CardContent>
        </Card>
        <section className="min-w-0 xl:col-span-2" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-3 text-base font-medium">Recent activity</h2>
          {activity.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">Nothing recorded for this user yet.</p>
          ) : (
            <AuditTable rows={activity.rows} locale={locale} timeZone={timezone} showUser={false} />
          )}
          {activity.total > activity.rows.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing the latest {activity.rows.length} of {activity.total}. <Link href={`/admin/audit-log?user=${detail.id}`} className="underline underline-offset-4">See all in the audit log</Link>.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
