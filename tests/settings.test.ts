import { describe, expect, it } from "vitest";
import { accentCss, contrastRatio, DEFAULT_ACCENT, isHexColor, passesAA, readableOn } from "@/lib/color";
import { settingsSchemas, settingsUpdateSchema } from "@/lib/validation/settings";
import { defaultSettings } from "@/config";

describe("every group accepts its own defaults", () => {
  for (const key of Object.keys(settingsSchemas) as Array<keyof typeof settingsSchemas>) {
    it(key, () => expect(settingsSchemas[key].safeParse(defaultSettings[key]).success).toBe(true));
  }
});

describe("settings validation", () => {
  it("checks currency, locale and timezone against the platform", () => {
    const ok = { currency: "usd", locale: "en-US", timezone: "America/New_York" };
    expect(settingsSchemas.locale.parse(ok).currency).toBe("USD");
    expect(settingsSchemas.locale.safeParse({ ...ok, currency: "XXQ1" }).success).toBe(false);
    expect(settingsSchemas.locale.safeParse({ ...ok, timezone: "Mars/Base" }).success).toBe(false);
    expect(settingsSchemas.locale.safeParse({ ...ok, locale: "not a locale!" }).success).toBe(false);
  });

  it("limits the bill number settings", () => {
    const base = { defaultCustomerName: "Walk-in", blockOutOfStock: false, sequencePadding: 4 };
    expect(settingsSchemas.billing.safeParse({ ...base, billPrefix: "INV-" }).success).toBe(true);
    expect(settingsSchemas.billing.safeParse({ ...base, billPrefix: "bad prefix!" }).success).toBe(false);
    expect(settingsSchemas.billing.safeParse({ ...base, billPrefix: "A", sequencePadding: 12 }).success).toBe(false);
  });

  it("validates tax percentages and the accent colour", () => {
    expect(settingsSchemas.tax.safeParse({ ignoreTax: false, defaultSgst: "9", defaultCgst: "60" }).success).toBe(false);
    expect(settingsSchemas.appearance.safeParse({ accent: "#12ab9f" }).success).toBe(true);
    expect(settingsSchemas.appearance.safeParse({ accent: "red" }).success).toBe(false);
    expect(settingsSchemas.appearance.safeParse({ accent: null }).success).toBe(true);
  });

  it("only accepts real image data for the logo", () => {
    const biz = { ...defaultSettings.business };
    expect(settingsSchemas.business.safeParse({ ...biz, logoUrl: "data:image/webp;base64,AAAA" }).success).toBe(true);
    expect(settingsSchemas.business.safeParse({ ...biz, logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsSchemas.business.safeParse({ ...biz, logoUrl: "data:image/svg+xml;base64,AAAA" }).success).toBe(false);
    expect(settingsSchemas.business.safeParse({ ...biz, gstin: "29abcde1234f1z5" }).data?.gstin).toBe("29ABCDE1234F1Z5");
  });

  it("knows the groups", () => {
    expect(settingsUpdateSchema.safeParse({ group: "tax", values: {} }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ group: "secrets", values: {} }).success).toBe(false);
  });
});

describe("accent colours", () => {
  it("measures contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("picks readable text and the default passes AA", () => {
    expect(readableOn("#ffffff")).toBe("#1b1411");
    expect(readableOn("#102a43")).toBe("#ffffff");
    expect(passesAA(DEFAULT_ACCENT)).toBe(true);
  });

  it("builds CSS only from a valid colour", () => {
    expect(accentCss("#336699")).toContain("--primary:#336699");
    expect(accentCss("red; } body { display: none")).toBe("");
    expect(isHexColor("#abc")).toBe(false);
  });
});
