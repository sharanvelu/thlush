import { nextDay, todayIn } from "@/lib/dates";
import { D } from "@/lib/money";

export const RANGES = ["today", "7d", "30d", "custom"] as const;
export type RangeKey = (typeof RANGES)[number];
export const MAX_CUSTOM_DAYS = 366;

export interface ResolvedRange {
  key: RangeKey;
  /** Inclusive first and last day, YYYY-MM-DD, in the business timezone. */
  from: string;
  to: string;
  days: number;
  /** The period of equal length immediately before, for trends. */
  prevFrom: string;
  prevTo: string;
}

const dayMs = 86_400_000;
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const shift = (day: string, by: number) => new Date(utc(day) + by * dayMs).toISOString().slice(0, 10);
const validDay = (v: string | undefined): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(utc(v)));

export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / dayMs) + 1;
}

/** Turns the URL's range choice into concrete days. Anything invalid becomes "today". */
export function resolveRange(
  key: string | undefined,
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
  now = new Date(),
): ResolvedRange {
  const today = todayIn(timeZone, 0, now);
  let range: { key: RangeKey; from: string; to: string };

  if (key === "7d") range = { key: "7d", from: shift(today, -6), to: today };
  else if (key === "30d") range = { key: "30d", from: shift(today, -29), to: today };
  else if (key === "custom" && validDay(from) && validDay(to)) {
    let a = from;
    let b = to;
    if (a > b) [a, b] = [b, a];
    if (b > today) b = today; // Nothing exists in the future.
    if (a > b) a = b;
    if (daysBetween(a, b) > MAX_CUSTOM_DAYS) a = shift(b, -(MAX_CUSTOM_DAYS - 1));
    range = { key: "custom", from: a, to: b };
  } else range = { key: "today", from: today, to: today };

  const days = daysBetween(range.from, range.to);
  const prevTo = shift(range.from, -1);
  return { ...range, days, prevTo, prevFrom: shift(prevTo, -(days - 1)) };
}

/** "+12.5" style change, rounded to 1 decimal. Null when there is nothing to compare against. */
export function percentChange(current: string | number, previous: string | number): number | null {
  const prev = new D(previous);
  if (prev.isZero()) return null;
  return new D(current).minus(prev).div(prev).times(100).toDecimalPlaces(1).toNumber();
}

/** Every day from..to, so a chart shows empty days as zero instead of skipping them. */
export function listDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let day = from; day <= to && out.length <= MAX_CUSTOM_DAYS; day = nextDay(day)) out.push(day);
  return out;
}

export interface SeriesPoint {
  /** Day (YYYY-MM-DD) or hour (0 to 23). */
  key: string;
  revenue: string;
  bills: number;
}

export function fillSeries(keys: string[], rows: Map<string, { revenue: string; bills: number }>): SeriesPoint[] {
  return keys.map((key) => ({ key, revenue: rows.get(key)?.revenue ?? "0.00", bills: rows.get(key)?.bills ?? 0 }));
}

/** At most `max` slices: the biggest ones, with the rest folded into "Other". */
export function foldSlices<T extends { name: string; value: string; color: string | null }>(slices: T[], max: number): Array<{ name: string; value: string; color: string | null }> {
  if (slices.length <= max) return slices;
  const head = slices.slice(0, max - 1);
  const rest = slices.slice(max - 1).reduce((acc, s) => acc.plus(s.value), new D(0));
  return [...head, { name: "Other", value: rest.toFixed(2), color: null }];
}
