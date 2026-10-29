import { tablePrefix } from "@/db/prefix";
import type { AppSettings } from "@/types/settings";

/** Static, build-time application settings. Runtime settings live in the DB. */
export const appConfig = {
  appName: "Thlush",
  /** Table prefix for every database object (override with DB_TABLE_PREFIX). */
  dbTablePrefix: tablePrefix,
  /** Session lifetime in seconds. */
  sessionMaxAgeSeconds: 60 * 60 * 12,
  /** Default and maximum page sizes for every list endpoint. */
  pagination: { defaultPageSize: 20, maxPageSize: 100 },
} as const;

/**
 * Defaults used until a value is saved in the `settings` table.
 * `SettingsService.get()` merges stored rows over these.
 */
export const defaultSettings: AppSettings = {
  business: {
    name: "Thlush",
    logoUrl: null,
    address: "",
    phone: "",
    email: "",
    gstin: "",
  },
  locale: {
    currency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },
  tax: {
    ignoreTax: false,
    defaultSgst: "2.5",
    defaultCgst: "2.5",
  },
  receipt: {
    header: "",
    footer: "Thank you! Visit again.",
    paperSize: "80mm",
  },
  billing: {
    billPrefix: "INV-",
    sequencePadding: 4,
    defaultCustomerName: "Walk-in Customer",
    blockOutOfStock: false,
  },
  appearance: {
    accent: null,
  },
  features: {
    inventory: true,
    discounts: true,
    orderTypes: true,
  },
};
