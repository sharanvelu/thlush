import type { Metadata } from "next";
import { InventoryDisabled } from "@/components/inventory/inventory-disabled";
import { StockView } from "@/components/inventory/stock-view";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { hasPermission } from "@/config/permissions";
import { stockListQuerySchema } from "@/lib/validation/inventory";
import { requireAccess } from "@/services/AuthService";
import { listCategoryOptions } from "@/services/CategoryService";
import { getSettings } from "@/services/SettingsService";
import { listStock } from "@/services/StockService";

export const metadata: Metadata = { title: "Stock Overview" };

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const { user, allowed } = await requireAccess("inventory.view");
  if (!allowed) return <Forbidden />;

  const settings = await getSettings();
  if (!settings.features.inventory) {
    return (
      <>
        <PageHeader title="Stock Overview" />
        <InventoryDisabled canChange={hasPermission(user.role, "settings.manage")} />
      </>
    );
  }

  const raw = await searchParams;
  const query = stockListQuerySchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const [{ rows, total, summary }, categories] = await Promise.all([listStock(query), listCategoryOptions()]);

  return (
    <StockView
      rows={rows}
      total={total}
      summary={summary}
      query={query}
      categories={categories}
      canAdjust={hasPermission(user.role, "inventory.adjust")}
      settings={{ currency: settings.locale.currency, locale: settings.locale.locale }}
    />
  );
}
