import type { Metadata } from "next";
import { AdjustForm } from "@/components/inventory/adjust-form";
import { InventoryDisabled } from "@/components/inventory/inventory-disabled";
import { MovementsView } from "@/components/inventory/movements-view";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { hasPermission } from "@/config/permissions";
import { movementQuerySchema } from "@/lib/validation/inventory";
import { requireAccess } from "@/services/AuthService";
import { getSettings } from "@/services/SettingsService";
import { listMovements, listTrackedOptions } from "@/services/StockService";

export const metadata: Metadata = { title: "Stock Adjustments" };

export default async function AdjustmentsPage({ searchParams }: PageProps<"/inventory/adjustments">) {
  const { user, allowed } = await requireAccess("inventory.adjust");
  if (!allowed) return <Forbidden />;

  const settings = await getSettings();
  if (!settings.features.inventory) {
    return (
      <>
        <PageHeader title="Stock Adjustments" />
        <InventoryDisabled canChange={hasPermission(user.role, "settings.manage")} />
      </>
    );
  }

  const raw = await searchParams;
  const query = movementQuerySchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const [items, { rows, total }] = await Promise.all([listTrackedOptions(), listMovements(query, settings.locale.timezone)]);

  return (
    <>
      <PageHeader title="Stock Adjustments" description="Correct counts, record wastage and see every change to stock." />
      <AdjustForm items={items} />
      <MovementsView rows={rows} total={total} query={query} items={items} settings={{ locale: settings.locale.locale, timezone: settings.locale.timezone }} />
    </>
  );
}
