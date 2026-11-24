/**
 * The menu as customers see it. Built from the billing screen's cached catalogue, but keeps only what is safe
 * and useful to show: no SKU, tax rates, stock settings or packaging charges. Pure, so it can be tested.
 */
import { D } from "@/lib/money";
import type { CachedPosCatalog } from "@/services/PosCatalogService";

export interface CustomerMenuItem {
  id: number;
  name: string;
  /** Base price, as stored. */
  price: string;
  isVeg: boolean | null;
  imageSrc: string | null;
  unit: string;
  /** Each size with its full price (base plus the size's difference). */
  variants: { name: string; price: string }[];
  addons: { name: string; price: string }[];
}

export interface CustomerMenuSection {
  id: number;
  name: string;
  items: CustomerMenuItem[];
}

export interface CustomerMenuOptions {
  /** A photo from the menu-photos folder for an item name, or null. Takes the place of an uploaded photo. */
  photoFor?: (itemName: string) => string | null;
}

export function buildCustomerMenu(catalog: CachedPosCatalog, options: CustomerMenuOptions = {}): CustomerMenuSection[] {
  const sections: CustomerMenuSection[] = [];
  for (const category of catalog.categories) {
    const items = catalog.items
      .filter((i) => i.categoryId === category.id && i.status === "active")
      .map(
        (i): CustomerMenuItem => ({
          id: i.id,
          name: i.name,
          price: i.price,
          isVeg: i.isVeg,
          // Stored photos are at /api/menu/<id>/image; on the customer domain that path maps to a public route.
          imageSrc: options.photoFor?.(i.name) ?? i.imageSrc,
          unit: i.unit,
          variants: i.variants.map((v) => ({ name: v.name, price: new D(i.price).plus(v.priceDelta).toFixed(2) })),
          addons: i.addons.map((a) => ({ name: a.name, price: a.price })),
        }),
      );
    if (items.length > 0) sections.push({ id: category.id, name: category.name, items });
  }
  return sections;
}
