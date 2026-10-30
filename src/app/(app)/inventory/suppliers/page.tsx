import type { Metadata } from "next";
import { z } from "zod";
import { InventoryDisabled } from "@/components/inventory/inventory-disabled";
import { SuppliersView } from "@/components/inventory/suppliers-view";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { hasPermission } from "@/config/permissions";
import { todayIn } from "@/lib/dates";
import { requireAccess } from "@/services/AuthService";
import { listPurchases, listSupplierOptions, listSuppliers } from "@/services/PurchasingService";
import { getSettings } from "@/services/SettingsService";
import { listTrackedOptions } from "@/services/StockService";

export const metadata: Metadata = { title: "Suppliers & Purchases" };

const querySchema = z.object({
  tab: z.enum(["purchases", "suppliers"]).catch("purchases").default("purchases"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});
const PAGE_SIZE = 20;

export default async function SuppliersPage({ searchParams }: PageProps<"/inventory/suppliers">) {
  const { user, allowed } = await requireAccess("suppliers.manage");
  if (!allowed) return <Forbidden />;

  const settings = await getSettings();
  if (!settings.features.inventory) {
    return (
      <>
        <PageHeader title="Suppliers & Purchases" />
        <InventoryDisabled canChange={hasPermission(user.role, "settings.manage")} />
      </>
    );
  }

  const raw = await searchParams;
  const { tab, page } = querySchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const empty = { rows: [], total: 0 };
  const [purchases, suppliers, supplierOptions, items] = await Promise.all([
    tab === "purchases" ? listPurchases({ page, pageSize: PAGE_SIZE }) : empty,
    tab === "suppliers" ? listSuppliers({ page, pageSize: PAGE_SIZE }) : empty,
    listSupplierOptions(),
    listTrackedOptions(),
  ]);

  return (
    <SuppliersView
      tab={tab}
      page={page}
      pageSize={PAGE_SIZE}
      purchases={purchases}
      suppliers={suppliers}
      supplierOptions={supplierOptions}
      items={items}
      canManage
      today={todayIn(settings.locale.timezone)}
      settings={{ currency: settings.locale.currency, locale: settings.locale.locale, timezone: settings.locale.timezone }}
    />
  );
}
