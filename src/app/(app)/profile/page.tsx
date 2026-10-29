import { Clock, Mail, Palette, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RoleBadge } from "@/components/layout/role-badge";
import { ThemeDropdown } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/services/AuthService";
import { getSettingsGroup } from "@/services/SettingsService";
import { getProfile } from "@/services/UserService";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, locale] = await Promise.all([getProfile(user.id), getSettingsGroup("locale")]);
  if (!profile) notFound();

  const rows = [
    { icon: Mail, label: "Email", value: profile.email },
    { icon: ShieldCheck, label: "Role", value: <RoleBadge role={profile.role} /> },
    {
      icon: Clock,
      label: "Last sign-in",
      value: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt, locale) : "Never",
    },
  ];

  return (
    <>
      <PageHeader title="Profile" description="Your account details and preferences." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{profile.name}</CardTitle>
            <CardDescription>
              {profile.hasPassword ? "Signs in with email and password." : "Signs in with single sign-on."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </dt>
                  <dd className="min-w-0 truncate font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Editing your name and email, and changing your password, arrive in a later milestone.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose light, dark, or follow your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeDropdown align="start">
              <Button variant="outline" className="gap-2">
                <Palette className="size-4" aria-hidden />
                Change theme
              </Button>
            </ThemeDropdown>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
