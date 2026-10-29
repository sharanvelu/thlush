"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Greets in the viewer's own local time. The server render uses a neutral
 * greeting, then the browser swaps in the right one without a hydration mismatch.
 */
export function Greeting({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const greeting = useSyncExternalStore(
    subscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back",
  );
  const today = useSyncExternalStore(
    subscribe,
    () =>
      new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(),
      ),
    () => "",
  );

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1 min-h-5 text-sm text-muted-foreground">{today}</p>
    </div>
  );
}
