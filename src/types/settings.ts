/**
 * Application settings, stored as one `settings` row per top-level key.
 * Percentages and amounts are strings so they can be handed to Decimal untouched.
 */
export interface BusinessSettings {
  name: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  email: string;
  gstin: string;
}

export interface LocaleSettings {
  /** ISO 4217 currency code, e.g. INR. */
  currency: string;
  /** BCP 47 locale used for number and date formatting, e.g. en-IN. */
  locale: string;
  /** IANA timezone used for "today", reports and bill-number dates. */
  timezone: string;
}

export interface TaxSettings {
  /** When true, SGST/CGST are not calculated or shown. */
  ignoreTax: boolean;
  defaultSgst: string;
  defaultCgst: string;
}

export type PaperSize = "58mm" | "80mm";

export interface ReceiptSettings {
  header: string;
  footer: string;
  paperSize: PaperSize;
  /** Print the kitchen slip after the receipt when a bill is saved. */
  printKitchenByDefault: boolean;
}

export interface BillingSettings {
  /** Prefix of generated bill numbers, e.g. "INV-". */
  billPrefix: string;
  /** Number of digits used to pad the per-day sequence. */
  sequencePadding: number;
  /** Customer name used when a bill has no customer. Empty disables the default. */
  defaultCustomerName: string;
  /** Refuse to sell tracked items whose stock is zero. */
  blockOutOfStock: boolean;
}

/** How a menu item's packaging charge is added to a bill. */
export type PackagingMode = "per_unit" | "per_line" | "per_bill";

export interface PackagingSettings {
  /** Order types that get packaging charges ("dine_in", "takeaway", "delivery"). Empty turns the charge off. */
  orderTypes: Array<"dine_in" | "takeaway" | "delivery">;
  /** per_unit: charge x quantity. per_line: the charge once per item line. per_bill: once for the whole bill. */
  mode: PackagingMode;
  /** Charge SGST and CGST on packaging, at the rates of the item it belongs to. */
  taxed: boolean;
  /**
   * The packaging charge for a whole bill, used when `mode` is "per_bill". When above 0 it replaces the
   * per-item charges; at 0 the highest item charge is used instead.
   */
  billAmount: string;
}

export interface SsoSettings {
  /** Also end the SSO provider's session when a user logs out (only used when SSO is configured). */
  logoutFromProvider: boolean;
}

export interface AppearanceSettings {
  /** Accent colour as a CSS colour value; null keeps the built-in warm orange. */
  accent: string | null;
}

export interface FeatureToggles {
  inventory: boolean;
  discounts: boolean;
  orderTypes: boolean;
}

export interface AppSettings {
  business: BusinessSettings;
  locale: LocaleSettings;
  tax: TaxSettings;
  receipt: ReceiptSettings;
  billing: BillingSettings;
  packaging: PackagingSettings;
  sso: SsoSettings;
  appearance: AppearanceSettings;
  features: FeatureToggles;
}

export type SettingsKey = keyof AppSettings;
