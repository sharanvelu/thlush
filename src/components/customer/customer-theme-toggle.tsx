"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

// True once hydrated. The saved choice only exists in the browser, so nothing is marked selected until then.
const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** Light / Dark / System, as a small pill of three buttons. The choice is saved by next-themes in local storage. */
export function CustomerThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const current = hydrated ? theme : undefined;

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-0.5 shadow-sm backdrop-blur-xl"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              selected && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
