import type { Metadata } from "next";
import { CustomerMenu } from "@/components/customer/customer-menu";
import { BrandMark } from "@/components/customer/brand-mark";
import { getCustomerBrand } from "@/lib/customer-brand";
import { buildCustomerMenu } from "@/lib/customer-menu";
import { getCachedPosCatalog } from "@/services/PosCatalogService";
import { getSettingsGroup } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Menu" };

// The menu itself comes from the cache shared with the billing screen, so rendering per request is cheap
// and a menu edit shows up straight away.
export const dynamic = "force-dynamic";

export default async function CustomerMenuPage() {
  const [catalog, locale, brand] = await Promise.all([
    getCachedPosCatalog(),
    getSettingsGroup("locale"),
    getCustomerBrand(),
  ]);
  const sections = buildCustomerMenu(catalog);
  const itemCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex flex-col items-center gap-2 pt-12 pb-6 text-center">
        <BrandMark logoSrc={brand.logoSrc} name={brand.name} className="size-20" />
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{brand.name}</h1>
        <p className="text-sm text-muted-foreground">
          Our menu
          {itemCount > 0 ? <span className="text-brand"> · {itemCount} dishes</span> : null}
        </p>
      </header>

      {sections.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">The menu isn&apos;t available right now.</p>
      ) : (
        <CustomerMenu sections={sections} currency={locale.currency} locale={locale.locale} />
      )}
    </main>
  );
}
