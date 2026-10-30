import { describe, expect, it } from "vitest";
import { daysBetween, fillSeries, foldSlices, listDays, percentChange, resolveRange } from "@/lib/dashboard";

const NOW = new Date("2026-10-30T10:00:00Z"); // 15:30 on the 30th in Kolkata

describe("resolveRange", () => {
  it("defaults to today", () => {
    expect(resolveRange(undefined, undefined, undefined, "Asia/Kolkata", NOW)).toMatchObject({ key: "today", from: "2026-10-30", to: "2026-10-30", days: 1, prevFrom: "2026-10-29", prevTo: "2026-10-29" });
    expect(resolveRange("nonsense", undefined, undefined, "UTC", NOW).key).toBe("today");
  });

  it("uses the business timezone for today", () => {
    expect(resolveRange("today", undefined, undefined, "Asia/Kolkata", new Date("2026-10-30T20:00:00Z")).from).toBe("2026-10-31");
  });

  it("covers 7 and 30 days ending today, with an equal previous period", () => {
    expect(resolveRange("7d", undefined, undefined, "UTC", NOW)).toMatchObject({ from: "2026-10-24", to: "2026-10-30", days: 7, prevFrom: "2026-10-17", prevTo: "2026-10-23" });
    expect(resolveRange("30d", undefined, undefined, "UTC", NOW)).toMatchObject({ days: 30, from: "2026-10-01", prevFrom: "2026-09-01", prevTo: "2026-09-30" });
  });

  it("accepts a custom range, swaps a reversed one and never looks into the future", () => {
    expect(resolveRange("custom", "2026-10-01", "2026-10-10", "UTC", NOW)).toMatchObject({ key: "custom", days: 10, prevFrom: "2026-09-21", prevTo: "2026-09-30" });
    expect(resolveRange("custom", "2026-10-10", "2026-10-01", "UTC", NOW)).toMatchObject({ from: "2026-10-01", to: "2026-10-10" });
    expect(resolveRange("custom", "2026-10-20", "2027-01-01", "UTC", NOW).to).toBe("2026-10-30");
    expect(resolveRange("custom", "2030-01-01", "2030-02-01", "UTC", NOW)).toMatchObject({ from: "2026-10-30", to: "2026-10-30" });
  });

  it("caps a custom range at a year and falls back on bad dates", () => {
    expect(resolveRange("custom", "2020-01-01", "2026-10-30", "UTC", NOW).days).toBe(366);
    expect(resolveRange("custom", "oops", "2026-10-30", "UTC", NOW).key).toBe("today");
  });
});

describe("trend and buckets", () => {
  it("computes percent change and handles no previous data", () => {
    expect(percentChange("150.00", "100.00")).toBe(50);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange("33.33", "30")).toBe(11.1);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("lists every day and fills the empty ones with zero", () => {
    expect(daysBetween("2026-02-27", "2026-03-02")).toBe(4);
    const days = listDays("2026-10-29", "2026-11-01");
    expect(days).toEqual(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    const filled = fillSeries(days, new Map([["2026-10-30", { revenue: "50.00", bills: 2 }]]));
    expect(filled.map((p) => p.bills)).toEqual([0, 2, 0, 0]);
    expect(filled[0]?.revenue).toBe("0.00");
  });

  it("folds extra slices into Other", () => {
    const slices = Array.from({ length: 10 }, (_, i) => ({ name: `C${i}`, value: String(100 - i), color: "#fff" }));
    const folded = foldSlices(slices, 8);
    expect(folded).toHaveLength(8);
    expect(folded.at(-1)).toEqual({ name: "Other", value: "276.00", color: null });
    expect(foldSlices(slices.slice(0, 3), 8)).toHaveLength(3);
  });
});
