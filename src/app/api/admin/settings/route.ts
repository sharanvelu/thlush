import { ok, parseBody, withAuth } from "@/lib/api";
import { settingsUpdateSchema } from "@/lib/validation/settings";
import { getSettings, saveSettingsGroup } from "@/services/SettingsService";

export const GET = withAuth(async () => ok(await getSettings()), { permission: "settings.manage" });

/** Saves one group of settings: `{ group: "tax", values: { ... } }`. */
export const PATCH = withAuth(
  async (req, { user }) => {
    const { group, values } = await parseBody(req, settingsUpdateSchema);
    return ok({ group, values: await saveSettingsGroup(group, values, user.id) });
  },
  { permission: "settings.manage" },
);
