/**
 * Free-text print jobs for the Custom Print page. Each text block becomes its own slip on the
 * thermal printer, followed by a paper cut, using the same ESC/POS builder as bills.
 */
import { concatBytes, EscPosBuilder, paperColumns, wrapText } from "@/lib/escpos";
import type { PaperSize } from "@/types/settings";

export type CustomAlign = "left" | "center" | "right";

export interface CustomSection {
  text: string;
  align: CustomAlign;
  bold: boolean;
  /** Double width and height. Halves the characters that fit on a line. */
  large: boolean;
}

/** A block that would print nothing (empty or only blank lines). */
export const isBlankSection = (section: CustomSection): boolean => section.text.trim() === "";

/** Characters that fit on one line of `paperSize`, at normal or large size. */
export function lineWidth(paperSize: PaperSize, large: boolean): number {
  const columns = paperColumns(paperSize);
  return large ? Math.floor(columns / 2) : columns;
}

/**
 * Wraps text to `width`, keeping blank lines and each line's leading spaces (so a typed layout
 * survives), and dropping trailing blank lines.
 */
export function layoutCustomText(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\s+$/, "").split(/\r?\n/)) {
    const indent = Math.min(/^ */.exec(paragraph.replace(/\t/g, "  "))?.[0].length ?? 0, Math.floor(width / 2));
    const pad = " ".repeat(indent);
    for (const line of wrapText(paragraph.trim(), width - indent)) lines.push(`${pad}${line}`.trimEnd());
  }
  return lines;
}

/** One slip: the block's text, then a feed and a cut. */
export function customSectionToEscPos(section: CustomSection, paperSize: PaperSize): Uint8Array {
  const p = new EscPosBuilder(paperColumns(paperSize));
  p.init().align(section.align).bold(section.bold).size(section.large ? 2 : 1, section.large ? 2 : 1);
  for (const line of layoutCustomText(section.text, lineWidth(paperSize, section.large))) p.line(line);
  return p.size(1, 1).bold(false).feed(2).cut().build();
}

/** The whole job: every non-empty block in order, each cut off from the next. */
export function buildCustomPrintJob(sections: CustomSection[], paperSize: PaperSize): Uint8Array {
  return concatBytes(sections.filter((s) => !isBlankSection(s)).map((s) => customSectionToEscPos(s, paperSize)));
}
