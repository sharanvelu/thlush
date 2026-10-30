import PDFDocument from "pdfkit";
import type { ReportColumn, ReportData } from "@/lib/reports";

type Doc = InstanceType<typeof PDFDocument>;

const MARGIN = 36;
const ROW = 18;
const HEAD = "#222222";
const MUTED = "#666666";
const RULE = "#cccccc";

/** Numbers print with grouping but no symbol: the built-in PDF fonts have no rupee glyph. */
function cell(value: string | undefined, column: ReportColumn, locale: string): string {
  if (value === undefined || value === "") return "";
  if (column.format === "money") return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  if (column.format === "percent") return `${value}%`;
  if (column.format === "number") return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(Number(value));
  return value;
}

/** A table report as a PDF. Wide reports go on landscape pages; the header row repeats on every page. */
export function reportToPdf(report: ReportData, opts: { businessName: string; currency: string; locale: string; generatedAt: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const landscape = report.columns.length > 6;
    const doc: Doc = new PDFDocument({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: MARGIN, info: { Title: report.title } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const width = doc.page.width - MARGIN * 2;
    const bottom = () => doc.page.height - MARGIN - 14;

    // First column takes the slack; the rest share the remainder by label length.
    const numeric = report.columns.slice(1);
    const numericWidth = Math.min(88, Math.max(54, (width * 0.6) / Math.max(1, numeric.length)));
    const widths = report.columns.map((_, i) => (i === 0 ? width - numericWidth * numeric.length : numericWidth));
    const align = (c: ReportColumn): "left" | "right" => (c.format === "text" ? "left" : "right");

    const drawRow = (y: number, values: string[], opts2: { bold?: boolean; fill?: string }) => {
      if (opts2.fill) doc.save().rect(MARGIN, y - 3, width, ROW).fill(opts2.fill).restore();
      doc.font(opts2.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(HEAD);
      let x = MARGIN;
      report.columns.forEach((c, i) => {
        doc.text(values[i] ?? "", x + 3, y, { width: widths[i]! - 6, align: align(c), lineBreak: false, ellipsis: true });
        x += widths[i]!;
      });
    };

    const header = () => {
      const y = doc.y;
      drawRow(y, report.columns.map((c) => c.label), { bold: true, fill: "#eeeeee" });
      doc.moveTo(MARGIN, y + ROW - 3).lineTo(MARGIN + width, y + ROW - 3).strokeColor(RULE).lineWidth(0.5).stroke();
      doc.y = y + ROW;
    };

    doc.font("Helvetica-Bold").fontSize(15).fillColor(HEAD).text(report.title, MARGIN, MARGIN);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text([opts.businessName, report.period, `Amounts in ${opts.currency}`].filter(Boolean).join("  |  "));
    doc.text(`Generated ${opts.generatedAt}`);
    doc.moveDown(0.8);

    if (report.rows.length === 0) {
      doc.fontSize(10).fillColor(MUTED).text("No data for this period.");
    } else {
      header();
      report.rows.forEach((r, index) => {
        if (doc.y > bottom() - ROW) {
          doc.addPage();
          doc.y = MARGIN;
          header();
        }
        drawRow(doc.y, report.columns.map((c) => cell(r[c.key], c, opts.locale)), { fill: index % 2 === 1 ? "#f8f8f8" : undefined });
        doc.y += ROW;
      });
      if (report.totals) {
        if (doc.y > bottom() - ROW) {
          doc.addPage();
          doc.y = MARGIN;
        }
        const totals = report.totals;
        doc.moveTo(MARGIN, doc.y - 2).lineTo(MARGIN + width, doc.y - 2).strokeColor(HEAD).lineWidth(0.8).stroke();
        drawRow(doc.y + 2, report.columns.map((c, i) => (i === 0 ? "Total" : cell(totals[c.key], c, opts.locale))), { bold: true });
        doc.y += ROW + 2;
      }
      if (report.truncated) {
        doc.moveDown(0.5).font("Helvetica-Oblique").fontSize(8).fillColor(MUTED).text("Only the first rows are shown. Narrow the date range to see the rest.", MARGIN);
      }
    }

    doc.end();
  });
}
