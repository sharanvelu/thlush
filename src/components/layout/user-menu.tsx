"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { LogoutOverlay } from "@/components/layout/logout-overlay";
import { RoleBadge } from "@/components/layout/role-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GLASS_MENU } from "@/components/layout/glass";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/types/user";
import { endProviderSessionInBackground } from "@/lib/background-logout";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters.map((p) => p?.charAt(0).toUpperCase() ?? "").join("") || "?";
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [loggingOut, startLogout] = useTransition();

  // Logging out normally redirects from the server. With "SSO in the background" the app session has ended and
  // a URL comes back: send the logout request to the provider (the loader stays up meanwhile), then go to the sign-in page.
  const logout = () =>
    startLogout(async () => {
      const { backgroundUrl } = await logoutAction();
      if (backgroundUrl) {
        await endProviderSessionInBackground(backgroundUrl);
        router.replace("/login");
        router.refresh();
      }
    });

  return (
    <>
      {loggingOut ? <LogoutOverlay /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={cn("w-60", GLASS_MENU)}>
          <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            <RoleBadge role={user.role} className="mt-1 w-fit" />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserIcon aria-hidden /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={loggingOut}
            // Keep the menu open until the redirect, so "Logging out…" is seen.
            onSelect={(event) => {
              event.preventDefault();
              logout();
            }}
          >
            <LogOut aria-hidden /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
