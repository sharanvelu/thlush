import { describe, expect, it } from "vitest";
import { categoryPatchSchema, categorySchema } from "@/lib/validation/category";
import { customerPatchSchema } from "@/lib/validation/customer";
import { menuBulkSchema, menuItemPatchSchema, menuItemSchema, menuListQuerySchema } from "@/lib/validation/menu";

const validItem = {
  name: "Masala Dosa",
  categoryId: 2,
  price: "90",
  sgst: "2.5",
  cgst: "2.5",
};

describe("menuItemSchema", () => {
  it("accepts a minimal item and applies defaults", () => {
    const result = menuItemSchema.parse(validItem);
    expect(result.status).toBe("active");
    expect(result.variants).toEqual([]);
    expect(result.addons).toEqual([]);
    expect(result.description).toBeNull();
    expect(result.sku).toBeNull();
    expect(result.isVeg).toBeNull();
  });

  it("turns blank optional text into null and trims", () => {
    const result = menuItemSchema.parse({ ...validItem, name: "  Dosa  ", description: "   ", sku: "" });
    expect(result.name).toBe("Dosa");
    expect(result.description).toBeNull();
    expect(result.sku).toBeNull();
  });

  it.each(["", "abc", "-5", "1.234", "1,000"])("rejects the price %j", (price) => {
    expect(menuItemSchema.safeParse({ ...validItem, price }).success).toBe(false);
  });

  it("rejects tax above 50% and malformed rates", () => {
    expect(menuItemSchema.safeParse({ ...validItem, sgst: "51" }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...validItem, cgst: "2.555" }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...validItem, sgst: "50" }).success).toBe(true);
  });

  it("requires a category", () => {
    expect(menuItemSchema.safeParse({ ...validItem, categoryId: undefined }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...validItem, categoryId: 0 }).success).toBe(false);
  });

  it("normalises currency and rejects bad codes", () => {
    expect(menuItemSchema.parse({ ...validItem, currency: "inr" }).currency).toBe("INR");
    expect(menuItemSchema.safeParse({ ...validItem, currency: "₹" }).success).toBe(false);
  });

  it("validates image sources", () => {
    expect(menuItemSchema.safeParse({ ...validItem, imageUrl: "data:image/webp;base64,AAAA" }).success).toBe(true);
    expect(menuItemSchema.safeParse({ ...validItem, imageUrl: "https://example.com/a.jpg" }).success).toBe(true);
    expect(menuItemSchema.safeParse({ ...validItem, imageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...validItem, imageUrl: "data:image/svg+xml;base64,AAAA" }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...validItem, imageUrl: "http://example.com/a.jpg" }).success).toBe(false);
  });

  it("validates variants and add-ons", () => {
    const ok = menuItemSchema.safeParse({
      ...validItem,
      variants: [{ name: "Large", priceDelta: "-10.50" }],
      addons: [{ name: "Extra cheese", price: "20" }],
    });
    expect(ok.success).toBe(true);
    expect(menuItemSchema.safeParse({ ...validItem, variants: [{ name: "", priceDelta: "0" }] }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...validItem, addons: [{ name: "x", price: "-1" }] }).success).toBe(false);
  });

  it("supports partial updates", () => {
    expect(menuItemSchema.partial().safeParse({ status: "disabled" }).success).toBe(true);
    expect(menuItemSchema.partial().safeParse({ price: "abc" }).success).toBe(false);
  });
});

describe("menuListQuerySchema", () => {
  it("falls back to defaults for missing or invalid values", () => {
    const query = menuListQuerySchema.parse({ page: "zero", sort: "bogus", status: "nope", category: "x", view: "?" });
    expect(query).toMatchObject({ page: 1, sort: "name", dir: "asc", status: "all", view: "table", group: "category", pageSize: 100 });
    expect(query.category).toBeUndefined();
  });

  it("uses a smaller default page size when not grouped, and honours an explicit one", () => {
    expect(menuListQuerySchema.parse({ group: "none" }).pageSize).toBe(20);
    expect(menuListQuerySchema.parse({ pageSize: "50" }).pageSize).toBe(50);
    expect(menuListQuerySchema.parse({ pageSize: "999" }).pageSize).toBe(100);
    expect(menuListQuerySchema.parse({ group: "none", pageSize: "x" }).pageSize).toBe(20);
  });

  it("reads valid values", () => {
    const query = menuListQuerySchema.parse({ q: " dosa ", category: "3", sort: "price", dir: "desc", page: "2" });
    expect(query).toMatchObject({ q: "dosa", category: 3, sort: "price", dir: "desc", page: 2 });
  });
});

describe("menuBulkSchema", () => {
  it("requires a category for move", () => {
    expect(menuBulkSchema.safeParse({ action: "move", ids: [1] }).success).toBe(false);
    expect(menuBulkSchema.safeParse({ action: "move", ids: [1], categoryId: 2 }).success).toBe(true);
  });

  it("rejects empty selections and unknown actions", () => {
    expect(menuBulkSchema.safeParse({ action: "delete", ids: [] }).success).toBe(false);
    expect(menuBulkSchema.safeParse({ action: "explode", ids: [1] }).success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("accepts a name only and fills defaults", () => {
    expect(categorySchema.parse({ name: "Drinks" })).toMatchObject({
      name: "Drinks",
      status: "active",
      color: null,
      icon: null,
      description: null,
    });
  });

  it("rejects empty names, bad colours and unknown icons", () => {
    expect(categorySchema.safeParse({ name: "  " }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "A", color: "orange" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "A", icon: "rocket" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "A", color: "#f97316", icon: "coffee" }).success).toBe(true);
  });
});

describe("update schemas never invent fields", () => {
  // A default inside an update schema would be filled in for fields the caller did not send,
  // overwriting real data (for example wiping variants when only the status is toggled).
  it("a menu item update contains only what was sent", () => {
    expect(menuItemPatchSchema.parse({ status: "disabled" })).toEqual({ status: "disabled" });
    expect(menuItemPatchSchema.parse({})).toEqual({});
    expect(menuItemPatchSchema.parse({ price: "12" })).toEqual({ price: "12" });
  });

  it("a category update contains only what was sent", () => {
    expect(categoryPatchSchema.parse({ name: "Drinks" })).toEqual({ name: "Drinks" });
    expect(categoryPatchSchema.parse({ status: "disabled" })).toEqual({ status: "disabled" });
  });

  it("a customer update contains only what was sent", () => {
    expect(customerPatchSchema.parse({ name: "Asha" })).toEqual({ name: "Asha" });
    expect(customerPatchSchema.parse({ tags: ["VIP"] })).toEqual({ tags: ["VIP"] });
  });

  it("creating still fills in the defaults", () => {
    const item = menuItemSchema.parse({ name: "Tea", categoryId: 1, price: "10", sgst: "2.5", cgst: "2.5" });
    expect(item).toMatchObject({ status: "active", variants: [], addons: [], trackStock: false, unit: "pcs", reorderLevel: "0", costPrice: "0" });
    expect(categorySchema.parse({ name: "X" }).status).toBe("active");
  });

  it("validates the stock fields", () => {
    const base = { name: "Tea", categoryId: 1, price: "10", sgst: "2.5", cgst: "2.5" };
    expect(menuItemSchema.safeParse({ ...base, trackStock: true, unit: "kg", reorderLevel: "2.5", costPrice: "40", openingStock: "12.250" }).success).toBe(true);
    expect(menuItemSchema.safeParse({ ...base, unit: "box" }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...base, reorderLevel: "-1" }).success).toBe(false);
    expect(menuItemSchema.safeParse({ ...base, openingStock: "1.2345" }).success).toBe(false);
    expect(menuItemPatchSchema.safeParse({ openingStock: "5" }).data).toEqual({});
  });
});
