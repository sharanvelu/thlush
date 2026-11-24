import type { Viewport } from "next";
import { ThemeSwitch } from "@/components/customer/theme-switch";

/** The customer site starts light (see the root layout); `ThemeSwitch` updates this when dark is chosen. */
export const viewport: Viewport = { themeColor: "#fbfaf8" };

/**
 * A soft spot of the accent colour, fading out by 65% of its size. `at` places its centre. Sizes are capped
 * by the screen width, so on a phone the spots stay small and in the corners instead of washing the page.
 */
const spot = (width: number, height: number, at: string, strength: number) =>
  `radial-gradient(min(${width}rem, 75vw) min(${height}rem, 55vw) at ${at}, color-mix(in oklab, var(--primary) ${strength}%, transparent), transparent 65%)`;

/** Four spots, one near each corner, a little different in size and strength so it doesn't look stamped. */
const BACKGROUND = [
  spot(42, 30, "0% 0%", 18),
  spot(34, 28, "100% 14%", 11),
  spot(36, 30, "4% 100%", 12),
  spot(44, 30, "100% 100%", 17),
].join(", ");

/**
 * The customer-facing site. Served at the root of the customer domain (the proxy rewrites every path under
 * `/c`), and never on the POS domain. Keep it free of anything from the staff app: no staff components,
 * no staff services, no session. Colours come from the app's theme tokens, so the accent chosen in Settings
 * (and light or dark mode) carries over; the page itself stays neutral.
 */
export default function CustomerLayout({ children }: LayoutProps<"/c">) {
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-background text-foreground antialiased">
      {/* Fixed to the window, so the spots stay at the screen's corners while the menu scrolls. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundImage: BACKGROUND }} />
      {/* Scrolls away with the page, so it never sits on top of the menu's sticky search bar. */}
      <ThemeSwitch className="absolute top-3 right-3 z-20 sm:top-4 sm:right-4" />
      {children}
    </div>
  );
}
