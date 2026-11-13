import { describe, expect, it } from "vitest";
import { buildCustomPrintJob, isBlankSection, layoutCustomText, lineWidth, type CustomSection } from "@/lib/escpos-custom";
import { canAccessPath, hasPermission } from "@/config/permissions";

const CUT = [0x1d, 0x56, 66, 0];
const section = (text: string, over: Partial<CustomSection> = {}): CustomSection => ({ text, align: "left", bold: false, large: false, ...over });
const decode = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

function cutOffsets(bytes: Uint8Array): number[] {
  const found: number[] = [];
  for (let i = 0; i <= bytes.length - CUT.length; i++) if (CUT.every((b, j) => bytes[i + j] === b)) found.push(i);
  return found;
}

describe("buildCustomPrintJob", () => {
  it("cuts after every text block, with each block's text before its cut", () => {
    const job = buildCustomPrintJob([section("First slip"), section("Second slip"), section("Third slip")], "80mm");
    const cuts = cutOffsets(job);
    expect(cuts).toHaveLength(3);
    const text = decode(job);
    expect(text.indexOf("First slip")).toBeLessThan(cuts[0]!);
    expect(text.indexOf("Second slip")).toBeGreaterThan(cuts[0]!);
    expect(text.indexOf("Second slip")).toBeLessThan(cuts[1]!);
    expect(text.indexOf("Third slip")).toBeGreaterThan(cuts[1]!);
    expect(cuts[2]).toBe(job.length - CUT.length); // the job ends on the last cut
  });

  it("skips empty and whitespace-only blocks, and prints nothing for no text", () => {
    expect(cutOffsets(buildCustomPrintJob([section("Only one"), section("  \n \n"), section("")], "58mm"))).toHaveLength(1);
    expect(buildCustomPrintJob([section("")], "80mm")).toHaveLength(0);
    expect(isBlankSection(section(" \n"))).toBe(true);
  });

  it("sets alignment, bold and size for a block, and resets them after", () => {
    const job = [...buildCustomPrintJob([section("Hi", { align: "center", bold: true, large: true })], "80mm")];
    const has = (seq: number[]) => job.some((_, i) => seq.every((b, j) => job[i + j] === b));
    expect(has([0x1b, 0x61, 1])).toBe(true); // centre
    expect(has([0x1b, 0x45, 1])).toBe(true); // bold on
    expect(has([0x1d, 0x21, 0x11])).toBe(true); // double width and height
    expect(has([0x1d, 0x21, 0x00])).toBe(true); // back to normal size
    expect(has([0x1b, 0x45, 0])).toBe(true); // bold off
  });

  it("starts every slip by fitting the print area to the paper", () => {
    const job = [...buildCustomPrintJob([section("A"), section("B")], "58mm")];
    const gsW = job.map((_, i) => (job[i] === 0x1d && job[i + 1] === 0x57 ? i : -1)).filter((i) => i >= 0);
    expect(gsW).toHaveLength(2);
    expect(job.slice(gsW[0]! + 2, gsW[0]! + 4)).toEqual([384 & 0xff, 384 >> 8]);
  });
});

describe("layoutCustomText", () => {
  it("keeps blank lines and leading spaces, wraps long lines, and drops trailing blanks", () => {
    expect(layoutCustomText("Title\n\n  indented line\n\n\n", 20)).toEqual(["Title", "", "  indented line"]);
    expect(layoutCustomText("aaaa bbbb cccc", 9)).toEqual(["aaaa bbbb", "cccc"]);
  });

  it("halves the line width for large text", () => {
    expect([lineWidth("80mm", false), lineWidth("80mm", true), lineWidth("58mm", false), lineWidth("58mm", true)]).toEqual([48, 24, 32, 16]);
  });
});

describe("custom print access", () => {
  it("is limited to the super admin, in the permission and in the route map", () => {
    expect(hasPermission("super_admin", "print.custom")).toBe(true);
    expect(canAccessPath("super_admin", "/thermal-print/custom")).toBe(true);
    for (const role of ["manager", "billing"] as const) {
      expect(hasPermission(role, "print.custom")).toBe(false);
      expect(canAccessPath(role, "/thermal-print/custom")).toBe(false);
    }
    expect(canAccessPath(null, "/thermal-print/custom")).toBe(false);
  });
});
