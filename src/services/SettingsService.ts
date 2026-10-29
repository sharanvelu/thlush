import { eq } from "drizzle-orm";
import { db, schema, type DbExecutor } from "@/db";
import { defaultSettings } from "@/config";
import type { AppSettings, SettingsKey } from "@/types/settings";

const KEYS = Object.keys(defaultSettings) as SettingsKey[];

/** Overlays stored values on the defaults, keeping only keys the group defines. */
function mergeGroup<K extends SettingsKey>(key: K, stored: unknown): AppSettings[K] {
  const base = defaultSettings[key];
  if (!stored || typeof stored !== "object") return { ...base };
  const merged: Record<string, unknown> = { ...base };
  for (const field of Object.keys(base)) {
    if (field in stored) merged[field] = (stored as Record<string, unknown>)[field];
  }
  return merged as unknown as AppSettings[K];
}

/** All settings, with defaults filling anything not yet saved. */
export async function getSettings(executor: DbExecutor = db): Promise<AppSettings> {
  const rows = await executor.select().from(schema.settings);
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const result = {} as Record<SettingsKey, unknown>;
  for (const key of KEYS) result[key] = mergeGroup(key, byKey.get(key));
  return result as unknown as AppSettings;
}

export async function getSettingsGroup<K extends SettingsKey>(
  key: K,
  executor: DbExecutor = db,
): Promise<AppSettings[K]> {
  const [row] = await executor
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .limit(1);
  return mergeGroup(key, row?.value);
}

/** Saves a (partial) settings group. Unknown fields are dropped. */
export async function updateSettingsGroup<K extends SettingsKey>(
  key: K,
  patch: Partial<AppSettings[K]>,
  userId: string | null = null,
  executor: DbExecutor = db,
): Promise<AppSettings[K]> {
  const current = await getSettingsGroup(key, executor);
  const next = mergeGroup(key, { ...current, ...patch });
  await executor
    .insert(schema.settings)
    .values({ key, value: next as unknown as Record<string, unknown>, updatedBy: userId })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: next as unknown as Record<string, unknown>, updatedBy: userId, updatedAt: new Date() },
    });
  return next;
}

/** Inserts every default group that is missing. Safe to run repeatedly. */
export async function ensureDefaultSettings(executor: DbExecutor = db): Promise<void> {
  await executor
    .insert(schema.settings)
    .values(
      KEYS.map((key) => ({
        key,
        value: defaultSettings[key] as unknown as Record<string, unknown>,
      })),
    )
    .onConflictDoNothing({ target: schema.settings.key });
}
