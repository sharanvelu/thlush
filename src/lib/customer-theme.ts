/**
 * The customer site's theme settings, kept apart from the staff app's.
 *
 * - Follows the visitor's device (system) until they pick Light or Dark.
 * - Saved in the browser under its own key. The staff app uses `theme`; sharing it would let a staff
 *   choice leak into the customer menu on any origin where both are served (local development, previews).
 */
export const CUSTOMER_THEME_KEY = "customer-theme";

/** Set by the proxy on every customer-site request, read by the root layout. */
export const SITE_HEADER = "x-thlush-site";

export const CUSTOMER_THEME_PROPS = {
  storageKey: CUSTOMER_THEME_KEY,
  defaultTheme: "system",
} as const;
