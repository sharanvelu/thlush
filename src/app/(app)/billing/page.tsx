import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { PosScreen } from "@/components/pos/pos-screen";
import type { PosItem } from "@/components/pos/pos-cart";
import { requireAccess } from "@/services/AuthService";
import { listHeldBills } from "@/services/BillingService";
import { getCachedPosCatalog, getPosStock } from "@/services/PosCatalogService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "New Bill" };

export default async function BillingPage() {
  const { user, allowed } = await requireAccess("bills.create");
  if (!allowed) return <Forbidden />;

  // The menu comes from the cache (cleared by any menu or category edit); stock and held bills are live.
  const [cached, stock, appSettings, held] = await Promise.all([
    getCachedPosCatalog(),
    getPosStock(),
    getSettings(),
    listHeldBills(user),
  ]);

  const categories = cached.categories;
  const items: PosItem[] = cached.items.map((i) => ({
    ...i,
    // With Inventory switched off, stock is not shown or enforced at the till.
    trackStock: i.trackStock && appSettings.features.inventory,
    stockQty: stock.get(i.id) ?? "0",
  }));

  return (
    <PosScreen
      items={items}
      categories={categories}
      initialHeld={held}
      appSettings={appSettings}
      settings={{
        currency: appSettings.locale.currency,
        locale: appSettings.locale.locale,
        timezone: appSettings.locale.timezone,
        ignoreTax: appSettings.tax.ignoreTax,
        discountsEnabled: appSettings.features.discounts,
        orderTypesEnabled: appSettings.features.orderTypes,
        blockOutOfStock: appSettings.billing.blockOutOfStock,
        walkInLabel: appSettings.billing.defaultCustomerName || "Walk-in customer",
      }}
    />
  );
}
