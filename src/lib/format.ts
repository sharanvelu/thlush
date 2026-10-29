export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

/** e.g. "30 Oct 2026, 2:15 pm" in the business timezone. */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  { locale = "en-IN", timeZone = "Asia/Kolkata" }: DateFormatOptions = {},
): string {
  if (value === null || value === undefined) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

/** e.g. "30 Oct 2026" in the business timezone. */
export function formatDate(
  value: Date | string | number | null | undefined,
  { locale = "en-IN", timeZone = "Asia/Kolkata" }: DateFormatOptions = {},
): string {
  if (value === null || value === undefined) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}
