import { createHash } from "node:crypto";
import { appConfig } from "@/config";
import { getSettingsGroup } from "@/services/SettingsService";

export interface CustomerBrand {
  name: string;
  /** The logo from Settings, served by the public `/brand-icon` route; null when none is set. */
  logoSrc: string | null;
}

/** The shop's name and logo for customer pages. Falls back to the app name if the database is unreachable. */
export async function getCustomerBrand(): Promise<CustomerBrand> {
  try {
    const { name, logoUrl } = await getSettingsGroup("business");
    // The version changes with the logo, so browsers fetch a new one instead of keeping the old.
    const version = logoUrl ? createHash("sha1").update(logoUrl).digest("hex").slice(0, 10) : null;
    return { name: name.trim() || appConfig.appName, logoSrc: version ? `/brand-icon?v=${version}` : null };
  } catch {
    return { name: appConfig.appName, logoSrc: null };
  }
}
