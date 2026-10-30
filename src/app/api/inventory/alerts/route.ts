import { ok, withAuth } from "@/lib/api";
import { getSettingsGroup } from "@/services/SettingsService";
import { lowStock } from "@/services/StockService";

/** Items at or under their reorder level, for the notifications bell. Empty when Inventory is off. */
export const GET = withAuth(
  async () => {
    const features = await getSettingsGroup("features");
    return ok(features.inventory ? await lowStock(8) : { total: 0, items: [] });
  },
  { permission: "inventory.view" },
);
