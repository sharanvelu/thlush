import { type NextRequest, NextResponse } from "next/server";
import { getSettingsGroup } from "@/services/SettingsService";

/**
 * The browser-tab and home-screen icon: the logo saved in Settings, or the built-in icon when there is none.
 * Public, because the sign-in page needs an icon too. The page links it with `?v=<hash of the logo>`, so a
 * new logo is a new URL and browsers do not keep showing the old icon.
 */
export async function GET(req: NextRequest) {
  const fallback = req.nextUrl.searchParams.get("kind") === "apple" ? "/apple-icon-default.png" : "/favicon-default.png";
  const builtInIcon = () => NextResponse.redirect(new URL(fallback, req.url), { status: 307, headers: { "Cache-Control": "no-store" } });

  let logo: string | null = null;
  try {
    logo = (await getSettingsGroup("business")).logoUrl;
  } catch {
    return builtInIcon(); // Database unreachable: the built-in icon still works.
  }
  if (!logo) return builtInIcon();

  if (logo.startsWith("https://")) {
    return NextResponse.redirect(logo, { status: 307, headers: { "Cache-Control": "no-store" } });
  }
  const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(logo);
  if (!match?.[1] || !match[2]) return builtInIcon();
  return new Response(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
