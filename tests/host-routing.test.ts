import { describe, expect, it } from "vitest";
import { normalizeHost, routeForHost } from "@/lib/host-routing";

const both = { pos: "pos.shop.in", customer: "order.shop.in" };

describe("normalizeHost", () => {
  it("lowercases and strips scheme, port and path", () => {
    expect(normalizeHost("https://Order.Shop.in:443/menu")).toBe("order.shop.in");
    expect(normalizeHost("pos.shop.in:3000")).toBe("pos.shop.in");
  });
  it("treats empty as unset", () => {
    expect(normalizeHost("  ")).toBeNull();
    expect(normalizeHost(undefined)).toBeNull();
  });
});

describe("routeForHost", () => {
  it("rewrites every customer-host path under /c", () => {
    expect(routeForHost("order.shop.in", "/", both)).toEqual({ kind: "rewrite", path: "/c" });
    expect(routeForHost("order.shop.in", "/menu", both)).toEqual({ kind: "rewrite", path: "/c/menu" });
    // Staff paths simply land on routes that do not exist under /c.
    expect(routeForHost("order.shop.in", "/login", both)).toEqual({ kind: "rewrite", path: "/c/login" });
    expect(routeForHost("order.shop.in", "/c/menu", both)).toEqual({ kind: "rewrite", path: "/c/c/menu" });
  });

  it("maps the customer API under /api/c and never reaches staff API routes", () => {
    expect(routeForHost("order.shop.in", "/api/bills", both)).toEqual({ kind: "rewrite", path: "/api/c/bills" });
    expect(routeForHost("order.shop.in", "/api/auth/signin", both)).toEqual({ kind: "rewrite", path: "/api/c/auth/signin" });
  });

  it("shares the brand icon", () => {
    expect(routeForHost("order.shop.in", "/brand-icon", both)).toEqual({ kind: "customer-direct" });
  });

  it("serves the POS on the POS host and hides /c there", () => {
    expect(routeForHost("pos.shop.in", "/billing", both)).toEqual({ kind: "pos" });
    expect(routeForHost("pos.shop.in", "/c", both)).toEqual({ kind: "not-found" });
    expect(routeForHost("pos.shop.in", "/c/menu", both)).toEqual({ kind: "not-found" });
    expect(routeForHost("pos.shop.in", "/api/c/x", both)).toEqual({ kind: "not-found" });
    expect(routeForHost("pos.shop.in", "/catalog", both)).toEqual({ kind: "pos" });
  });

  it("404s an unknown host once a domain is configured", () => {
    expect(routeForHost("thlush.vercel.app", "/login", both)).toEqual({ kind: "not-found" });
    expect(routeForHost(null, "/", both)).toEqual({ kind: "not-found" });
    expect(routeForHost("thlush.vercel.app", "/", { pos: "pos.shop.in" })).toEqual({ kind: "not-found" });
  });

  it("matches hosts case-insensitively and ignores ports", () => {
    expect(routeForHost("POS.shop.in:443", "/billing", both)).toEqual({ kind: "pos" });
  });

  it("behaves like today with no domains configured, and opens /c only when allowed", () => {
    expect(routeForHost("localhost:3000", "/billing", {})).toEqual({ kind: "pos" });
    expect(routeForHost("localhost:3000", "/c", {})).toEqual({ kind: "not-found" });
    expect(routeForHost("localhost:3000", "/c", { allowDirectCustomer: true })).toEqual({ kind: "customer-direct" });
  });
});
