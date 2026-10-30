import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { MenuView } from "@/components/menu/menu-view";
import { hasPermission } from "@/config/permissions";
import { menuListQuerySchema } from "@/lib/validation/menu";
import { requireAccess } from "@/services/AuthService";
import { listCategoryOptions } from "@/services/CategoryService";
import { listMenuItems } from "@/services/MenuService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  const { user, allowed } = await requireAccess("menu.view");
  if (!allowed) return <Forbidden />;

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  // Invalid values fall back to defaults, so a hand-edited URL never errors.
  const query = menuListQuerySchema.parse(flat);

  const [{ rows, total, groupTotals }, categories, settings] = await Promise.all([
    listMenuItems(query),
    listCategoryOptions(),
    getSettings(),
  ]);

  return (
    <MenuView
      items={rows}
      total={total}
      groupTotals={groupTotals}
      query={query}
      categories={categories}
      canManage={hasPermission(user.role, "menu.manage")}
      defaults={{
        inventory: settings.features.inventory,
        currency: settings.locale.currency,
        locale: settings.locale.locale,
        sgst: settings.tax.defaultSgst,
        cgst: settings.tax.defaultCgst,
      }}
      openNew={flat.new === "1"}
    />
  );
}
