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
