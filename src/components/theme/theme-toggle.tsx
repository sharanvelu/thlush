"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MenuContentProps = Pick<ComponentProps<typeof DropdownMenuContent>, "side" | "align">;

/** Wraps any trigger element with a Light / Dark / System menu. */
export function ThemeDropdown({
  children,
  side = "bottom",
  align = "end",
}: MenuContentProps & { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="min-w-36">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Icon button for the top bar. The icon swaps with CSS, so it never mismatches on hydration. */
export function ThemeToggle() {
  return (
    <ThemeDropdown>
      <Button variant="ghost" size="icon" aria-label="Change theme">
        <Sun className="size-4 dark:hidden" aria-hidden />
        <Moon className="hidden size-4 dark:block" aria-hidden />
      </Button>
    </ThemeDropdown>
  );
}
