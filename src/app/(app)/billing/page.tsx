import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { PosScreen } from "@/components/pos/pos-screen";
import type { PosItem } from "@/components/pos/pos-cart";
import type { PosCategory } from "@/components/pos/product-panel";
import { requireAccess } from "@/services/AuthService";
import { listHeldBills } from "@/services/BillingService";
import { listCategoryOptions } from "@/services/CategoryService";
import { listCatalogForPos } from "@/services/MenuService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "New Bill" };

export default async function BillingPage() {
  const { user, allowed } = await requireAccess("bills.create");
  if (!allowed) return <Forbidden />;

  const [catalog, options, appSettings, held] = await Promise.all([
    listCatalogForPos(),
    listCategoryOptions(),
    getSettings(),
    listHeldBills(user),
  ]);

  // Disabled categories (and so their items) never reach the billing screen.
  const categories: PosCategory[] = options.filter((c) => c.status === "active");

  // Plain objects only: this crosses into a client component.
  const items: PosItem[] = catalog.map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    sgst: i.sgst,
    cgst: i.cgst,
    categoryId: i.categoryId,
    categoryName: i.categoryName,
    sku: i.sku,
    isVeg: i.isVeg,
    imageSrc: i.imageSrc,
    variants: i.variants,
    addons: i.addons,
    unit: i.unit,
    // With Inventory switched off, stock is not shown or enforced at the till.
    trackStock: i.trackStock && appSettings.features.inventory,
    stockQty: i.stockQty,
    status: i.status,
  }));

  return (
    <PosScreen
      items={items}
      categories={categories}
      initialHeldCount={held.length}
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
