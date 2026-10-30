/** Calendar parts of an instant in a given IANA timezone. */
export function zonedParts(date: Date, timeZone: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

/** "20261030": the business day an instant falls on, used in bill numbers. */
export function businessDayKey(date: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}${month}${day}`;
}

const partsFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** Offset of `timeZone` from UTC at an instant, in minutes (positive east of UTC). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = partsFormat(timeZone).formatToParts(instant);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** The instant a calendar day (YYYY-MM-DD) begins in `timeZone`. Handles daylight saving. */
export function zonedStartOfDay(day: string, timeZone: string): Date {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = offsetMinutes(new Date(guess), timeZone);
  let result = guess - first * 60_000;
  const second = offsetMinutes(new Date(result), timeZone);
  if (second !== first) result = guess - second * 60_000;
  return new Date(result);
}

/** The calendar day after `day`, as YYYY-MM-DD. */
export function nextDay(day: string): string {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * Turns an inclusive `from`..`to` day range in the business timezone into
 * `[start, end)` instants. Reversed ranges are swapped.
 */
export function zonedDayRange(
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): { start: Date | null; end: Date | null } {
  let a = from;
  let b = to;
  if (a && b && a > b) [a, b] = [b, a];
  return {
    start: a ? zonedStartOfDay(a, timeZone) : null,
    end: b ? zonedStartOfDay(nextDay(b), timeZone) : null,
  };
}

/** Today's date (YYYY-MM-DD) in `timeZone`, optionally shifted by whole days. */
export function todayIn(timeZone: string, offsetDays = 0, now = new Date()): string {
  const { year, month, day } = zonedParts(now, timeZone);
  const base = `${year}-${month}-${day}`;
  if (offsetDays === 0) return base;
  const [y = 0, m = 1, d = 1] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}
