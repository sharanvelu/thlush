/**
 * A tiny ESC/POS command builder for 58mm and 80mm thermal printers. It writes
 * raw bytes, so no printer driver is involved and the cutter is driven directly
 * by `cut()` rather than by the OS print queue.
 */
import type { PaperSize } from "@/types/settings";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
/** Width of one character of the standard font, in dots, on a 203 dpi printer. */
const DOTS_PER_COLUMN = 12;

/** Characters per line in the printer's standard font. */
export function paperColumns(paperSize: PaperSize): number {
  return paperSize === "58mm" ? 32 : 48;
}

/**
 * Maps text to what the printer's default code page (CP437) can show: accents are
 * stripped, a few symbols are swapped for ASCII, and anything else becomes "?".
 */
export function toPrinterText(text: string): string {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[·•]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/₹/g, "Rs.")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/gu, "?");
}

/** Breaks text into lines of at most `width` characters, splitting on spaces where it can. */
export function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of toPrinterText(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let rest = word;
      while (rest.length > width) {
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(rest.slice(0, width));
        rest = rest.slice(width);
      }
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= width) line += ` ${rest}`;
      else {
        out.push(line);
        line = rest;
      }
    }
    out.push(line);
  }
  return out;
}

/** Joins byte arrays end to end, e.g. several slips into one print job. */
export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export class EscPosBuilder {
  private readonly chunks: number[] = [];

  constructor(readonly columns: number) {}

  private raw(...bytes: number[]): this {
    this.chunks.push(...bytes);
    return this;
  }

  /**
   * Resets the printer and fits its print area to the paper. Starts every job. Centering and right
   * alignment work inside the print area, and a printer's default is its widest paper (80mm), so
   * without this a 58mm slip is centered on an 80mm width and everything drifts right.
   */
  init(): this {
    const dots = this.columns * DOTS_PER_COLUMN;
    return this.raw(ESC, 0x40, GS, 0x4c, 0, 0, GS, 0x57, dots & 0xff, dots >> 8);
  }

  align(side: "left" | "center" | "right"): this {
    return this.raw(ESC, 0x61, side === "left" ? 0 : side === "center" ? 1 : 2);
  }

  bold(on: boolean): this {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  /** Character size, 1 to 4 times normal in each direction. */
  size(width: 1 | 2 | 3 | 4 = 1, height: 1 | 2 | 3 | 4 = 1): this {
    return this.raw(GS, 0x21, ((width - 1) << 4) | (height - 1));
  }

  text(value: string): this {
    for (const char of toPrinterText(value)) this.chunks.push(char.charCodeAt(0));
    return this;
  }

  /** Prints a line of text followed by a line feed. */
  line(value = ""): this {
    return this.text(value).raw(LF);
  }

  rule(char = "-"): this {
    return this.line(char.repeat(this.columns));
  }

  /** `left` at the left edge and `right` at the right edge of one line. A long left side wraps above it. */
  row(left: string, right: string, columns = this.columns): this {
    const rightText = toPrinterText(right);
    const lines = wrapText(left, Math.max(1, columns - rightText.length - 1));
    const last = lines.pop() ?? "";
    for (const l of lines) this.line(l);
    const gap = Math.max(1, columns - last.length - rightText.length);
    return this.line(`${last}${" ".repeat(gap)}${rightText}`);
  }

  feed(lines = 1): this {
    return this.raw(ESC, 0x64, Math.min(255, Math.max(0, lines)));
  }

  /** Feeds the paper to the cutter, then cuts (partially by default, so the slip stays attached). */
  cut(full = false): this {
    return this.raw(GS, 0x56, full ? 65 : 66, 0);
  }

  build(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}
