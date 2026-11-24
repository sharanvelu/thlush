import { describe, expect, it } from "vitest";
import { buildCustomerMenu } from "@/lib/customer-menu";
import { buildPhotoIndex, photoFor, photoKey } from "@/lib/menu-photos";
import type { CachedPosItem } from "@/services/PosCatalogService";

describe("photoKey", () => {
  it("ignores case, spaces, punctuation and accents", () => {
    for (const name of ["Cold Coffee", "cold-coffee", "COLD_COFFEE", "  Cold   Coffee! ", "cold.coffee"]) {
      expect(photoKey(name)).toBe("cold-coffee");
    }
    expect(photoKey("Crème Brûlée")).toBe("creme-brulee");
    expect(photoKey("Mac & Cheese")).toBe(photoKey("mac and cheese"));
    expect(photoKey("!!!")).toBe("");
  });
});

describe("buildPhotoIndex", () => {
  const v = (name: string) => ({ name, version: "1" });

  it("matches files to item names and builds a cache-busting URL", () => {
    const index = buildPhotoIndex([v("Cold Coffee.JPG"), v("masala_dosa.png")]);
    expect(photoFor(index, "Cold Coffee")).toBe("/menu-photos/Cold%20Coffee.JPG?v=1");
    expect(photoFor(index, "Masala Dosa")).toBe("/menu-photos/masala_dosa.png?v=1");
    expect(photoFor(index, "Filter Coffee")).toBeNull();
  });

  it("ignores other file types and hidden files", () => {
    const index = buildPhotoIndex([v("README.md"), v(".DS_Store"), v("tea.gif"), v(".hidden.jpg")]);
    expect(index.size).toBe(0);
  });

  it("prefers webp, then jpg, jpeg and png, whatever order the disk lists them in", () => {
    const files = [v("tea.png"), v("Tea.jpeg"), v("tea.webp"), v("tea.jpg")];
    expect(photoFor(buildPhotoIndex(files), "Tea")).toBe("/menu-photos/tea.webp?v=1");
    expect(photoFor(buildPhotoIndex([...files].reverse()), "Tea")).toBe("/menu-photos/tea.webp?v=1");
    expect(photoFor(buildPhotoIndex([v("tea.png"), v("tea.jpg")]), "Tea")).toBe("/menu-photos/tea.jpg?v=1");
  });
});

describe("buildCustomerMenu with folder photos", () => {
  const item = (id: number, name: string, imageSrc: string | null): CachedPosItem => ({
    id,
    name,
    price: "50.00",
    sgst: "0",
    cgst: "0",
    categoryId: 1,
    categoryName: "Drinks",
    sku: null,
    isVeg: true,
    imageSrc,
    variants: [],
    addons: [],
    unit: "pcs",
    trackStock: false,
    status: "active",
    packagingCharge: "0.00",
  });

  it("uses a folder photo over an uploaded one, and keeps the upload when there is none", () => {
    const index = buildPhotoIndex([{ name: "tea.jpg", version: "1" }]);
    const [section] = buildCustomerMenu(
      {
        categories: [{ id: 1, name: "Drinks", color: null, icon: null }],
        items: [item(1, "Tea", "/api/menu/1/image?v=a"), item(2, "Coffee", "/api/menu/2/image?v=b"), item(3, "Juice", null)],
      },
      { photoFor: (name) => photoFor(index, name) },
    );
    expect(section!.items.map((i) => i.imageSrc)).toEqual(["/menu-photos/tea.jpg?v=1", "/api/menu/2/image?v=b", null]);
  });
});
