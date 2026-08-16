import * as XLSX from "xlsx";

export interface Column {
  header: string;
  key: string;
  width?: number;
}

/**
 * Generate an Excel file buffer from rows + column config.
 * Returns a Buffer ready to be sent as a download.
 */
export function generateExcel(
  sheetName: string,
  columns: Column[],
  rows: Record<string, any>[]
): Buffer {
  // Build worksheet data — header + rows
  const headerRow = columns.map((c) => c.header);
  const dataRows = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v;
      return v;
    })
  );

  const wsData = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 15 }));

  // Freeze first row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Make header bold (SheetJS free doesn't support styling well —
  // but header will still be first row and frozen)

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Standard filename with date suffix.
 */
export function excelFilename(base: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${base}_${date}.xlsx`;
}