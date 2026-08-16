import * as XLSX from "xlsx";

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
}

/**
 * Parse an Excel file buffer into rows.
 * Uses the first row as headers.
 * Header keys are normalized (lowercase, no spaces).
 */
export function parseExcelBuffer(buffer: ArrayBuffer): {
  rawHeaders: string[];
  rows: ParsedRow[];
} {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const raw: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (raw.length === 0) return { rawHeaders: [], rows: [] };

  const rawHeaders = (raw[0] as any[]).map((h) => (h ? String(h).trim() : ""));
  const normalized = rawHeaders.map(normalizeHeader);

  const rows: ParsedRow[] = raw.slice(1).map((rowArr: any[], idx) => {
    const data: Record<string, any> = {};
    normalized.forEach((key, i) => {
      if (key) data[key] = rowArr[i];
    });
    return { rowNumber: idx + 2, data }; // +2 = header row + 1-indexed
  });

  return { rawHeaders, rows };
}

/**
 * Normalize header for matching:
 * "Roll Number" → "rollnumber"
 * "Roll No." → "rollno"
 * "E-mail" → "email"
 */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Try multiple possible header variations to find a value.
 */
export function pickField(
  row: Record<string, any>,
  candidates: string[]
): any {
  for (const c of candidates) {
    const key = normalizeHeader(c);
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}