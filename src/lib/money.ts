import Decimal from "decimal.js";

/**
 * Money policy
 * ------------
 * - Amounts are `numeric` in Postgres and arrive from Drizzle as strings.
 * - All arithmetic uses Decimal, never JS numbers.
 * - Values are rounded half-up to 2 decimal places (currency) at the line level.
 * - JS numbers are used only for display, via `formatMoney`.
 */
export const D = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
export type Dec = Decimal;

export type Numeric = string | number | Decimal | null | undefined;

/** Parses a DB numeric or user input into a Decimal. Invalid or empty input becomes 0. */
export function toDecimal(value: Numeric): Decimal {
  if (value === null || value === undefined || value === "") return new D(0);
  try {
    const parsed = new D(value);
    return parsed.isFinite() ? parsed : new D(0);
  } catch {
    return new D(0);
  }
}

/** Rounds to 2 decimal places, half-up. */
export function round2(value: Numeric): Decimal {
  return toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Fixed 2-decimal string, the canonical form for storing and returning amounts. */
export function parseMoney(value: Numeric): string {
  return round2(value).toFixed(2);
}

/** Fixed 3-decimal string, used for quantities and stock. */
export function parseQuantity(value: Numeric): string {
  return toDecimal(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
}

export function sum(values: Numeric[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new D(0));
}

export interface FormatMoneyOptions {
  currency?: string;
  locale?: string;
  /** Drop the currency symbol and return only the formatted number. */
  plain?: boolean;
}

/** Formats an amount for display. Defaults match `defaultSettings.locale`. */
export function formatMoney(value: Numeric, options: FormatMoneyOptions = {}): string {
  const { currency = "INR", locale = "en-IN", plain = false } = options;
  const amount = round2(value).toFixed(2) as `${number}`;
  const formatter = new Intl.NumberFormat(locale, {
    ...(plain ? {} : { style: "currency" as const, currency }),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}
