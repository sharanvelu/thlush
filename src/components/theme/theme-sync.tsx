"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Applies the theme saved on the account when this device has not chosen one yet,
 * so signing in on a new tablet looks the way the user left it elsewhere.
 */
export function ThemeSync({ preference }: { preference: "light" | "dark" | "system" }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    try {
      if (window.localStorage.getItem("theme") === null && preference !== "system") setTheme(preference);
    } catch {
      // Storage can be blocked; the system theme simply stays.
    }
  }, [preference, setTheme]);
  return null;
}
