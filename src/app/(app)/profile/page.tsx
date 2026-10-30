import { Clock, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RoleBadge } from "@/components/layout/role-badge";
import { ProfileForms } from "@/components/profile/profile-forms";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/services/AuthService";
import { getSettingsGroup } from "@/services/SettingsService";
import { getProfile } from "@/services/UserService";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, locale] = await Promise.all([getProfile(user.id), getSettingsGroup("locale")]);
  if (!profile) notFound();

  const facts = [
    { icon: Mail, label: "Email", value: profile.email },
    { icon: ShieldCheck, label: "Role", value: <RoleBadge role={profile.role} /> },
    { icon: Clock, label: "Last sign-in", value: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt, { locale: locale.locale, timeZone: locale.timezone }) : "Never" },
  ];

  return (
    <>
      <PageHeader title="Profile" description="Your account details and preferences." />
      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-card">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="truncate text-sm font-medium">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <ProfileForms name={profile.name} email={profile.email} hasPassword={profile.hasPassword} themePreference={profile.themePreference} />
    </>
  );
}
