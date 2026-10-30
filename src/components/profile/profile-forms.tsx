"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { passwordSchema } from "@/lib/validation/user";

interface ProfileFormsProps {
  name: string;
  email: string;
  /** SSO accounts get their name, email and sign-in from the identity provider. */
  hasPassword: boolean;
  themePreference: "light" | "dark" | "system";
}

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
});

const passwordFormSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords don't match" });

export function ProfileForms({ name, email, hasPassword, themePreference }: ProfileFormsProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [theme, setThemeState] = useState(themePreference);

  const details = useForm<z.infer<typeof detailsSchema>>({ resolver: zodResolver(detailsSchema), defaultValues: { name, email } });
  const password = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const saveDetails = details.handleSubmit(async (values) => {
    try {
      await api.patch("/api/me/profile", values);
      toast.success("Profile updated");
      details.reset(values);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors?.email?.[0]) details.setError("email", { message: error.fieldErrors.email[0] });
      else toast.error(errorMessage(error));
    }
  });

  const savePassword = password.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await api.post("/api/me/password", { currentPassword, newPassword });
      toast.success("Password changed");
      password.reset();
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors?.currentPassword?.[0]) password.setError("currentPassword", { message: error.fieldErrors.currentPassword[0] });
      else toast.error(errorMessage(error));
    }
  });

  const chooseTheme = async (value: string) => {
    if (!value) return;
    const next = value as typeof theme;
    const previous = theme;
    setThemeState(next);
    setTheme(next);
    try {
      await api.patch("/api/me/profile", { themePreference: next });
    } catch (error) {
      setThemeState(previous);
      setTheme(previous);
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>{hasPassword ? "How you appear on bills and in the audit log." : "Your name and email come from single sign-on."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveDetails} noValidate>
            <FieldGroup>
              <Field data-invalid={Boolean(details.formState.errors.name)}>
                <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                <Input id="profile-name" disabled={!hasPassword} {...details.register("name")} aria-invalid={Boolean(details.formState.errors.name)} />
                <FieldError errors={[details.formState.errors.name]} />
              </Field>
              <Field data-invalid={Boolean(details.formState.errors.email)}>
                <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                <Input id="profile-email" type="email" disabled={!hasPassword} {...details.register("email")} aria-invalid={Boolean(details.formState.errors.email)} />
                <FieldError errors={[details.formState.errors.email]} />
              </Field>
              {hasPassword ? (
                <Button type="submit" className="w-fit" disabled={!details.formState.isDirty || details.formState.isSubmitting}>
                  {details.formState.isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                  Save details
                </Button>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Saved to your account, so it follows you to other devices.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup type="single" variant="outline" value={theme} onValueChange={chooseTheme} aria-label="Theme">
              <ToggleGroupItem value="light" className="gap-1.5 px-4"><Sun aria-hidden /> Light</ToggleGroupItem>
              <ToggleGroupItem value="dark" className="gap-1.5 px-4"><Moon aria-hidden /> Dark</ToggleGroupItem>
              <ToggleGroupItem value="system" className="gap-1.5 px-4"><Monitor aria-hidden /> System</ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>

        {hasPassword ? (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>You&apos;ll stay signed in on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} noValidate>
                <FieldGroup>
                  <Field data-invalid={Boolean(password.formState.errors.currentPassword)}>
                    <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                    <Input id="current-password" type="password" autoComplete="current-password" {...password.register("currentPassword")} aria-invalid={Boolean(password.formState.errors.currentPassword)} />
                    <FieldError errors={[password.formState.errors.currentPassword]} />
                  </Field>
                  <Field data-invalid={Boolean(password.formState.errors.newPassword)}>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <Input id="new-password" type="password" autoComplete="new-password" {...password.register("newPassword")} aria-invalid={Boolean(password.formState.errors.newPassword)} />
                    <FieldDescription>At least 8 characters, with a letter and a number.</FieldDescription>
                    <FieldError errors={[password.formState.errors.newPassword]} />
                  </Field>
                  <Field data-invalid={Boolean(password.formState.errors.confirm)}>
                    <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                    <Input id="confirm-password" type="password" autoComplete="new-password" {...password.register("confirm")} aria-invalid={Boolean(password.formState.errors.confirm)} />
                    <FieldError errors={[password.formState.errors.confirm]} />
                  </Field>
                  <Button type="submit" className="w-fit" disabled={password.formState.isSubmitting}>
                    {password.formState.isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                    Change password
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
