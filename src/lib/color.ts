/** Colour helpers for the accent setting. Accent colours are plain #rrggbb. */

export const DEFAULT_ACCENT = "#cc3300";
const HEX = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (v: string): boolean => HEX.test(v);

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT = "#ffffff";
const DARK = "#1b1411";

/** White or near-black, whichever reads better on the accent. */
export function readableOn(hex: string): string {
  return contrastRatio(hex, LIGHT) >= contrastRatio(hex, DARK) ? LIGHT : DARK;
}

/** WCAG AA asks for 4.5:1 for normal-size text. */
export const passesAA = (hex: string): boolean => contrastRatio(hex, readableOn(hex)) >= 4.5;

/** CSS that repaints the app's accent. Only ever built from a validated #rrggbb value. */
export function accentCss(hex: string): string {
  if (!isHexColor(hex)) return "";
  const fg = readableOn(hex);
  return `:root,.dark{--primary:${hex};--primary-foreground:${fg};--ring:${hex};--sidebar-primary:${hex};--sidebar-primary-foreground:${fg};--sidebar-ring:${hex};--chart-1:${hex}}`;
}
