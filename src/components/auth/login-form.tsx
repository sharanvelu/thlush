"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginAction, ssoLoginAction } from "@/app/actions/auth";
import { RoleBadge } from "@/components/layout/role-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Role } from "@/config/permissions";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type FormValues = z.infer<typeof schema>;

export interface DemoAccount {
  name: string;
  email: string;
  role: Role;
  password: string;
}

interface LoginFormProps {
  /** Where to go after signing in. Already sanitised on the server. */
  redirectTo: string;
  ssoEnabled: boolean;
  /** Empty outside the local environment. */
  demoAccounts: DemoAccount[];
  /** Error code handed back by Auth.js, e.g. from a failed SSO attempt. */
  authError?: string;
}

function ssoErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "AccessDenied") return "Your SSO account could not be used. Ask an administrator for access.";
  return "Sign-in failed. Please try again.";
}

export function LoginForm({ redirectTo, ssoEnabled, demoAccounts, authError }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(ssoErrorMessage(authError));
  const [pending, startTransition] = useTransition();
  const [ssoPending, startSso] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: FormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction({ ...values, redirect: redirectTo });
      // Only reached on failure: success redirects away.
      if (result && !result.ok) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (field === "email" || field === "password") {
            setError(field, { message: messages[0] });
          }
        }
      }
    });
  };

  const fillDemo = (account: DemoAccount) => {
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-describedby={formError ? "login-error" : undefined}>
        <FieldGroup>
          {formError ? (
            <div
              id="login-error"
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </div>
          ) : null}

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              autoFocus
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </Button>
            </div>
            <FieldError errors={[errors.password]} />
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </FieldGroup>
      </form>

      {ssoEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={ssoPending}
            onClick={() => startSso(() => ssoLoginAction(redirectTo))}
          >
            {ssoPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}
            Sign in with SSO
          </Button>
        </>
      ) : null}

      {demoAccounts.length > 0 ? (
        <section aria-label="Demo accounts" className="rounded-xl border border-dashed p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Local demo accounts (this box is hidden outside local)
          </p>
          <ul className="flex flex-col gap-1.5">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate">{account.email}</span>
                  <RoleBadge role={account.role} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
