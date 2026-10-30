import { describe, expect, it } from "vitest";
import { customerListQuerySchema, customerSchema, parseTags } from "@/lib/validation/customer";

describe("customerSchema", () => {
  it("needs only a name and turns blanks into null", () => {
    expect(customerSchema.parse({ name: "  Asha  ", phone: "", email: "", notes: "  " })).toEqual({ name: "Asha", phone: null, email: null, notes: null, tags: [] });
  });

  it("validates phone and email when given", () => {
    expect(customerSchema.safeParse({ name: "A", phone: "98450 10001" }).success).toBe(true);
    expect(customerSchema.safeParse({ name: "A", phone: "+91 (98450) 10001" }).success).toBe(true);
    expect(customerSchema.safeParse({ name: "A", phone: "call me" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "A", email: "nope" }).success).toBe(false);
    expect(customerSchema.parse({ name: "A", email: "Asha@Example.COM" }).email).toBe("asha@example.com");
  });

  it("rejects an empty name", () => {
    expect(customerSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("keeps one of each tag regardless of case, and caps the count", () => {
    expect(customerSchema.parse({ name: "A", tags: ["VIP", "vip", "office"] }).tags).toEqual(["VIP", "office"]);
    expect(customerSchema.safeParse({ name: "A", tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }).success).toBe(false);
  });

  it("splits typed tags on commas and new lines", () => {
    expect(parseTags("regular, office\n delivery ,,")).toEqual(["regular", "office", "delivery"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("customerListQuerySchema", () => {
  it("falls back to defaults and reads real values", () => {
    expect(customerListQuerySchema.parse({ sort: "bogus", page: "x" })).toMatchObject({ sort: "name_asc", page: 1, pageSize: 20 });
    expect(customerListQuerySchema.parse({ q: " asha ", sort: "spend_desc", page: "3" })).toMatchObject({ q: "asha", sort: "spend_desc", page: 3 });
  });
});
