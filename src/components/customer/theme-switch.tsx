"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const LIGHT_BAR = "#fbfaf8";
const DARK_BAR = "#171513";

const noSubscribe = () => () => {};

/**
 * Light / dark switch for the customer site. The site starts light; a visitor's choice is remembered on
 * their device. The icon swaps with CSS, so the server render and the first client render always match.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // False on the server and during hydration, true afterwards: the theme is only known on the client.
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  // Keep the phone's browser bar the same colour as the page.
  useEffect(() => {
    if (!mounted) return;
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = dark ? DARK_BAR : LIGHT_BAR;
    }
  }, [mounted, dark]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground shadow-lg shadow-black/10 backdrop-blur-xl transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none motion-reduce:transition-none",
        className,
      )}
    >
      <Moon className="size-[1.1rem] dark:hidden" aria-hidden />
      <Sun className="hidden size-[1.1rem] dark:block" aria-hidden />
    </button>
  );
}
