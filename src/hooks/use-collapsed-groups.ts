import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Remembers which menu categories the viewer has collapsed, in this browser only.
 * Stored in localStorage as a JSON array of category ids. Storage can be missing
 * or blocked, so every access is guarded and the UI works without it.
 */
const KEY = "thlush.menu.collapsed-groups";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function write(ids: number[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private mode or blocked storage: the change simply is not remembered.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parse(raw: string): number[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is number => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function useCollapsedGroups() {
  // The server has no storage, so it renders everything expanded and the browser corrects it.
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const collapsed = useMemo(() => new Set(parse(raw)), [raw]);

  const toggle = useCallback((id: number) => {
    const next = new Set(parse(read()));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write([...next]);
  }, []);

  /** Collapses every id in `ids`, or expands them all when `collapse` is false. */
  const setAll = useCallback((ids: number[], collapse: boolean) => {
    const next = new Set(parse(read()));
    for (const id of ids) {
      if (collapse) next.add(id);
      else next.delete(id);
    }
    write([...next]);
  }, []);

  return { collapsed, toggle, setAll };
}
