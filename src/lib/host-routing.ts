/**
 * Decides which half of the app a request may reach, from the host it came in on. Pure, so it can be tested.
 *
 * One deployment serves two domains: the POS (staff) and the customer site. The customer pages live under the
 * internal `/c` segment (see `src/app/(customer)/c`); on the customer domain every path is rewritten under it,
 * so staff routes cannot be reached from there, and on the POS domain `/c` does not exist.
 *
 * Neither domain configured: local development and previews. The POS works as usual and `/c` is open for
 * building customer pages (outside production). Any domain configured: a host that matches neither gets a 404.
 */

export type HostRoute =
  | { kind: "pos" }
  /** Customer pages opened directly at `/c/...` (development only): skip the sign-in check. */
  | { kind: "customer-direct" }
  | { kind: "rewrite"; path: string }
  | { kind: "not-found" };

export interface HostConfig {
  pos?: string | null;
  customer?: string | null;
  /** Lets `/c/...` be opened directly when no domain is configured. Never in production. */
  allowDirectCustomer?: boolean;
}

/** `https://Order.Shop.in:443/` and `order.shop.in` both become `order.shop.in`. Empty becomes null. */
export function normalizeHost(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) return null;
  const host = trimmed
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#]/)[0]
    ?.replace(/:\d+$/, "");
  return host || null;
}

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Files every page needs, served the same on both domains. */
const SHARED_PATHS = ["/brand-icon"];

export function routeForHost(hostHeader: string | null | undefined, pathname: string, config: HostConfig): HostRoute {
  const pos = normalizeHost(config.pos);
  const customer = normalizeHost(config.customer);
  const host = normalizeHost(hostHeader);

  if (!pos && !customer) {
    if (isUnder(pathname, "/c") || isUnder(pathname, "/api/c")) {
      return config.allowDirectCustomer ? { kind: "customer-direct" } : { kind: "not-found" };
    }
    return { kind: "pos" };
  }

  if (host && host === customer) {
    if (SHARED_PATHS.some((p) => isUnder(pathname, p))) return { kind: "customer-direct" };
    // Customer API lives at /api/c/**; the page routes at /c/**.
    if (pathname === "/api" || pathname.startsWith("/api/"))
      return { kind: "rewrite", path: `/api/c${pathname.slice(4)}` };
    return { kind: "rewrite", path: pathname === "/" ? "/c" : `/c${pathname}` };
  }

  if (host && host === pos) {
    return isUnder(pathname, "/c") || isUnder(pathname, "/api/c") ? { kind: "not-found" } : { kind: "pos" };
  }

  return { kind: "not-found" };
}
