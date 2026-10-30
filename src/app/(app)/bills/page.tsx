import type { Metadata } from "next";
import { BillsView } from "@/components/bills/bills-view";
import { Forbidden } from "@/components/layout/forbidden";
import { hasPermission } from "@/config/permissions";
import { billListQuerySchema } from "@/lib/validation/bill-history";
import { requireAccess } from "@/services/AuthService";
import { listBills } from "@/services/BillHistoryService";
import { getSettings } from "@/services/SettingsService";
import { listUserOptions } from "@/services/UserService";

export const metadata: Metadata = { title: "Bill History" };

export default async function BillsPage({ searchParams }: PageProps<"/bills">) {
  const { user, allowed } = await requireAccess("bills.view_own");
  if (!allowed) return <Forbidden />;

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  // Invalid values fall back to defaults, so a hand-edited URL never errors.
  const { page, pageSize, ...filters } = billListQuerySchema.parse(flat);

  const canSeeAll = hasPermission(user.role, "bills.view_all");
  const settings = await getSettings();
  const [result, cashiers] = await Promise.all([
    listBills(filters, { page, pageSize }, user, settings.locale.timezone),
    canSeeAll ? listUserOptions() : Promise.resolve(null),
  ]);

  return (
    <BillsView
      rows={result.rows}
      total={result.total}
      revenue={result.revenue}
      query={{ ...filters, page, pageSize }}
      cashiers={cashiers}
      canVoid={hasPermission(user.role, "bills.void")}
      currency={settings.locale.currency}
      settings={{
        locale: settings.locale.locale,
        timezone: settings.locale.timezone,
        walkInLabel: settings.billing.defaultCustomerName || "Walk-in Customer",
      }}
    />
  );
}
