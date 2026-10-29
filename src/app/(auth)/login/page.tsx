import { Receipt, Store } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm, type DemoAccount } from "@/components/auth/login-form";
import { appConfig } from "@/config";
import { DEMO_USERS, seedPassword } from "@/config/demo";
import { isLocalEnv, isOidcEnabled } from "@/env";
import { safeRedirectPath } from "@/lib/redirect";
import { getCurrentUser } from "@/services/AuthService";

export const metadata: Metadata = { title: "Sign in" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(first(params.redirect));

  // Already signed in (and the account still exists): go straight to the app.
  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  // Demo credentials are resolved here, so they never reach the browser outside local.
  const demoAccounts: DemoAccount[] = isLocalEnv
    ? DEMO_USERS.map((u) => ({ ...u, password: seedPassword() }))
    : [];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex"
        aria-hidden
      >
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Store className="size-5" />
          </span>
          {appConfig.appName}
        </div>
        <div className="max-w-md">
          <Receipt className="mb-6 size-10 opacity-80" />
          <p className="text-3xl leading-tight font-semibold text-balance">
            Billing that keeps up with your busiest hour.
          </p>
          <p className="mt-3 text-primary-foreground/80">
            Fast checkout, live stock and clear reports for restaurants, cafés and shops.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">&copy; {new Date().getFullYear()} {appConfig.appName}</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold">{appConfig.appName}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">Sign in to continue to your dashboard.</p>
          <LoginForm
            redirectTo={redirectTo}
            ssoEnabled={isOidcEnabled()}
            demoAccounts={demoAccounts}
            authError={first(params.error)}
          />
        </div>
      </main>
    </div>
  );
}
