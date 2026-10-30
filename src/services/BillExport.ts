import ExcelJS from "exceljs";
import { EXPORT_HEADER, EXPORT_NUMERIC_COLUMNS } from "@/lib/bill-export";

/** Builds an .xlsx file. Amounts and quantities are real numbers so they can be summed. */
export async function toXlsx(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Bills", { views: [{ state: "frozen", ySplit: 1 }] });

  sheet.columns = EXPORT_HEADER.map((header, index) => ({
    header,
    key: String(index),
    width: [20, 22, 24, 30, 8, 10, 12, 12, 12, 12][index] ?? 12,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row.map((cell, index) => ((EXPORT_NUMERIC_COLUMNS as readonly number[]).includes(index) ? Number(cell) : cell)));
  }
  for (const index of EXPORT_NUMERIC_COLUMNS) {
    if (index === 4) continue;
    sheet.getColumn(index + 1).numFmt = "#,##0.00";
    sheet.getColumn(index + 1).alignment = { horizontal: "right" };
  }
  sheet.autoFilter = { from: "A1", to: { row: 1, column: EXPORT_HEADER.length } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
