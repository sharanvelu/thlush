"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { AppSettings, SettingsKey } from "@/types/settings";

/** Edit one settings group locally, then save it whole. Server field errors land beside their inputs. */
export function useGroupForm<K extends SettingsKey>(group: K, initial: AppSettings[K]) {
  const router = useRouter();
  const [values, setValues] = useState<AppSettings[K]>(initial);
  const [saved, setSaved] = useState<AppSettings[K]>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = (patch: Partial<AppSettings[K]>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const response = await api.patch<{ group: K; values: AppSettings[K] }>("/api/admin/settings", { group, values });
      setValues(response.data.values);
      setSaved(response.data.values);
      toast.success("Settings saved");
      router.refresh(); // The sidebar, receipts and accent read these.
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors) {
        setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0] ?? "Invalid"])));
        toast.error("Fix the highlighted fields and try again.");
      } else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return { values, set, errors, dirty, saving, save, discard: () => { setValues(saved); setErrors({}); } };
}
