import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appConfig } from "@/config";
import { accentCss } from "@/lib/color";
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

export const metadata: Metadata = {
  title: { default: appConfig.appName, template: `%s · ${appConfig.appName}` },
  description: "Billing and point-of-sale for restaurants, cafés and small shops.",
  applicationName: appConfig.appName,
};

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
  const accent = await loadAccent();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        {accent ? <style id="accent-override" dangerouslySetInnerHTML={{ __html: accent }} /> : null}
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
