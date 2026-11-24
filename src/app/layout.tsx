import { createHash } from "node:crypto";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appConfig } from "@/config";
import { accentCss } from "@/lib/color";
import { CUSTOMER_SITE_HEADER } from "@/lib/host-routing";
import { getSettingsGroup } from "@/services/SettingsService";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Tab and home-screen icon: the logo from Settings (see `brand-icon/route.ts`), else the built-in one. */
export async function generateMetadata(): Promise<Metadata> {
  let version = "default";
  try {
    const { logoUrl } = await getSettingsGroup("business");
    // Changes whenever the logo does, so browsers fetch the new icon instead of keeping the old one.
    if (logoUrl) version = createHash("sha1").update(logoUrl).digest("hex").slice(0, 10);
  } catch {
    // Database unreachable: keep the built-in icon.
  }
  return {
    title: { default: appConfig.appName, template: `%s · ${appConfig.appName}` },
    description: "Billing and point-of-sale for restaurants, cafés and small shops.",
    applicationName: appConfig.appName,
    icons: {
      icon: `/brand-icon?v=${version}`,
      apple: `/brand-icon?kind=apple&v=${version}`,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#171513" },
  ],
};

/** The accent chosen in Settings. If the database is unreachable the built-in orange is used. */
async function loadAccent(): Promise<string> {
  try {
    const { accent } = await getSettingsGroup("appearance");
    return accent ? accentCss(accent) : "";
  } catch {
    return "";
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [accent, requestHeaders] = await Promise.all([loadAccent(), headers()]);
  // The customer site starts light whatever the device prefers, and remembers the visitor's own switch in a
  // key of its own (so trying it locally never mixes with the staff app's choice). The staff app keeps
  // following the device, or the choice saved on the account.
  const customerSite = requestHeaders.get(CUSTOMER_SITE_HEADER) === "1";
  const themeProps = customerSite ? { defaultTheme: "light", enableSystem: false, storageKey: "customer-theme" } : {};
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        {accent ? <style id="accent-override" dangerouslySetInnerHTML={{ __html: accent }} /> : null}
        <ThemeProvider {...themeProps}>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors closeButton position="top-right" offset={{ top: "5.25rem", right: "1rem" }} mobileOffset={{ top: "5.25rem", left: "0.75rem", right: "0.75rem" }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
