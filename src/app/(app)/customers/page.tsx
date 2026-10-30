import type { Metadata } from "next";
import { CustomersView } from "@/components/customers/customers-view";
import { Forbidden } from "@/components/layout/forbidden";
import { hasPermission } from "@/config/permissions";
import { customerListQuerySchema } from "@/lib/validation/customer";
import { requireAccess } from "@/services/AuthService";
import { listCustomerRecords } from "@/services/CustomerService";
import { getSettingsGroup } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const { user, allowed } = await requireAccess("customers.view");
  if (!allowed) return <Forbidden />;

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const query = customerListQuerySchema.parse(flat);
  const [{ rows, total }, locale] = await Promise.all([listCustomerRecords(query), getSettingsGroup("locale")]);

  return <CustomersView rows={rows} total={total} query={query} canManage={hasPermission(user.role, "customers.manage")} settings={locale} />;
}
