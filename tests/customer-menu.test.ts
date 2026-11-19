import { describe, expect, it } from "vitest";
import { buildCustomerMenu } from "@/lib/customer-menu";
import type { CachedPosCatalog, CachedPosItem } from "@/services/PosCatalogService";

const item = (over: Partial<CachedPosItem>): CachedPosItem => ({
  id: 1,
  name: "Masala Dosa",
  price: "80.00",
  sgst: "2.5",
  cgst: "2.5",
  categoryId: 1,
  categoryName: "Tiffin",
  sku: "DOSA-01",
  isVeg: true,
  imageSrc: null,
  variants: [],
  addons: [],
  unit: "pcs",
  trackStock: true,
  status: "active",
  packagingCharge: "5.00",
  ...over,
});

const catalog = (items: CachedPosItem[]): CachedPosCatalog => ({
  items,
  categories: [
    { id: 1, name: "Tiffin", color: null, icon: null },
    { id: 2, name: "Drinks", color: null, icon: null },
  ],
});

describe("buildCustomerMenu", () => {
  it("leaves out SKU, tax, stock and packaging details", () => {
    const [section] = buildCustomerMenu(catalog([item({})]));
    expect(Object.keys(section!.items[0]!).sort()).toEqual(
      ["addons", "id", "imageSrc", "isVeg", "name", "price", "unit", "variants"],
    );
  });

  it("hides disabled items and categories with nothing to show", () => {
    const sections = buildCustomerMenu(
      catalog([item({ id: 1 }), item({ id: 2, categoryId: 2, status: "disabled" })]),
    );
    expect(sections.map((s) => s.name)).toEqual(["Tiffin"]);
  });

  it("hides items whose category is not active", () => {
    expect(buildCustomerMenu(catalog([item({ categoryId: 99 })]))).toEqual([]);
  });

  it("prices each size as the base plus its difference", () => {
    const [section] = buildCustomerMenu(
      catalog([
        item({
          variants: [
            { name: "Regular", priceDelta: "0" },
            { name: "Large", priceDelta: "25.50" },
          ],
        }),
      ]),
    );
    expect(section!.items[0]!.variants).toEqual([
      { name: "Regular", price: "80.00" },
      { name: "Large", price: "105.50" },
    ]);
  });
});
