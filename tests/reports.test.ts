import { describe, expect, it } from "vitest";
import { exportFileName, formatCell, reportExportQuerySchema, reportQuerySchema, reportToCsv, share, sumColumn, type ReportData } from "@/lib/reports";

const report: ReportData = {
  kind: "category",
  title: "Sales by category",
  description: "",
  period: null,
  columns: [
    { key: "name", label: "Category", format: "text" },
    { key: "revenue", label: "Revenue", format: "money" },
    { key: "share", label: "Share", format: "percent" },
  ],
  rows: [
    { name: "Beverages", revenue: "1200.50", share: "60.0" },
    { name: "=HYPERLINK(\"x\")", revenue: "800.00", share: "40.0" },
  ],
  totals: { revenue: "2000.50", share: "100.0" },
  chart: null,
  truncated: false,
};

describe("share", () => {
  it("rounds to one decimal", () => expect(share("1", "3")).toBe("33.3"));
  it("is zero when there is no whole", () => expect(share("5", "0")).toBe("0.0"));
});

describe("sumColumn", () => {
  it("adds decimals without float drift", () => {
    expect(sumColumn([{ a: "0.1" }, { a: "0.2" }], "a")).toBe("0.30");
  });
  it("treats a missing value as zero", () => expect(sumColumn([{ a: "1.00" }, {}], "a")).toBe("1.00"));
});

describe("formatCell", () => {
  const fmt = { currency: "INR", locale: "en-IN" };
  it("formats money, percent and numbers", () => {
    expect(formatCell("1234.5", "money", fmt)).toContain("1,234.50");
    expect(formatCell("12.5", "percent", fmt)).toBe("12.5%");
    expect(formatCell("1200", "number", fmt)).toBe("1,200");
  });
  it("leaves text and blanks alone", () => {
    expect(formatCell("Tea", "text", fmt)).toBe("Tea");
    expect(formatCell(undefined, "money", fmt)).toBe("");
  });
});

describe("reportToCsv", () => {
  const csv = reportToCsv(report);
  it("starts with a BOM and the column labels", () => expect(csv.startsWith("﻿Category,Revenue,Share\r\n")).toBe(true));
  it("writes plain numbers", () => expect(csv).toContain("Beverages,1200.50,60.0"));
  it("neutralises spreadsheet formulas", () => expect(csv).toContain(`"'=HYPERLINK(""x"")"`));
  it("ends with a totals row", () => expect(csv.trimEnd().endsWith("Total,2000.50,100.0")).toBe(true));
});

describe("query parsing", () => {
  it("falls back to sales and daily for junk", () => {
    expect(reportQuerySchema.parse({ r: "nope", group: "year" })).toMatchObject({ r: "sales", group: "day" });
  });
  it("accepts a valid report and group", () => {
    expect(reportQuerySchema.parse({ r: "tax", group: "month" })).toMatchObject({ r: "tax", group: "month" });
  });
  it("defaults the export format to csv", () => {
    expect(reportExportQuerySchema.parse({ format: "xml" }).format).toBe("csv");
    expect(reportExportQuerySchema.parse({ format: "pdf" }).format).toBe("pdf");
  });
});

describe("exportFileName", () => {
  it("names the file after the range", () => expect(exportFileName("tax", "2026-10-01", "2026-10-30", "csv")).toBe("report-tax-2026-10-01_to_2026-10-30.csv"));
});
