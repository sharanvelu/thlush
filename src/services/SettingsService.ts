import { eq } from "drizzle-orm";
import { settingsSchemas } from "@/lib/validation/settings";
import * as AuditService from "@/services/AuditService";
import { HttpError } from "@/lib/errors";
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

/**
 * Validates and saves one settings group, with its audit entry, in one transaction.
 * Unknown fields are dropped, and a group is saved whole so partial forms cannot leave it half-set.
 */
export async function saveSettingsGroup<K extends SettingsKey>(key: K, values: unknown, userId: string): Promise<AppSettings[K]> {
  const parsed = settingsSchemas[key].safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".") || "_"] ??= []).push(issue.message);
    const first = parsed.error.issues[0];
    throw new HttpError(422, `${String(first?.path[0] ?? key)}: ${first?.message ?? "Invalid value"}`, fieldErrors);
  }
  return db.transaction(async (tx) => {
    const before = await getSettingsGroup(key, tx);
    const saved = await updateSettingsGroup(key, parsed.data as unknown as Partial<AppSettings[K]>, userId, tx);
    const after = saved as unknown as Record<string, unknown>;
    const prior = before as unknown as Record<string, unknown>;
    const changed = Object.keys(after).filter((field) => JSON.stringify(after[field]) !== JSON.stringify(prior[field]));
    await AuditService.record({ userId, action: "settings.update", entity: "settings", entityId: key, metadata: { group: key, changed } }, tx);
    return saved;
  });
}
