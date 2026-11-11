/**
 * Hardened, dynamically-loaded spreadsheet helper wrapping local SheetJS (xlsx 0.20.3).
 *
 * - Dynamically imports `xlsx` on demand so the ~400 kB library is never included
 *   in initial page bundles.
 * - Enforces file size, sheet count, row count, and column count caps.
 * - Disables formula and HTML evaluation (`cellFormula: false`, `cellHTML: false`).
 * - Strips dangerous prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
 *   from every parsed row.
 */

export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_SPREADSHEET_SHEETS = 10;
export const MAX_SPREADSHEET_ROWS = 2500;
export const MAX_SPREADSHEET_COLS = 60;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export interface ParseSpreadsheetOptions {
  maxBytes?: number;
  maxRows?: number;
  maxCols?: number;
  sheetIndex?: number;
}

function sanitizeRow(raw: Record<string, unknown>, maxCols: number): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  let colCount = 0;
  for (const [rawKey, value] of Object.entries(raw)) {
    const key = String(rawKey).trim();
    if (!key || FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (colCount >= maxCols) break;
    colCount++;
    clean[key] = value;
  }
  return clean;
}

export async function parseSpreadsheetBuffer(
  buffer: ArrayBuffer | Uint8Array,
  options: ParseSpreadsheetOptions = {}
): Promise<Record<string, unknown>[]> {
  const maxBytes = options.maxBytes ?? MAX_SPREADSHEET_BYTES;
  const maxRows = options.maxRows ?? MAX_SPREADSHEET_ROWS;
  const maxCols = options.maxCols ?? MAX_SPREADSHEET_COLS;
  const sheetIndex = options.sheetIndex ?? 0;

  const byteLength = buffer.byteLength;
  if (byteLength === 0) {
    throw new Error("The uploaded spreadsheet file is empty.");
  }
  if (byteLength > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Spreadsheet exceeds the ${mb} MB upload limit.`);
  }

  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    sheetRows: maxRows + 1, // +1 for header row
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("No worksheets were found in the uploaded file.");
  }
  if (wb.SheetNames.length > MAX_SPREADSHEET_SHEETS) {
    throw new Error(
      `Workbook has ${wb.SheetNames.length} sheets (maximum supported is ${MAX_SPREADSHEET_SHEETS}).`
    );
  }

  const targetName = wb.SheetNames[Math.min(sheetIndex, wb.SheetNames.length - 1)];
  const ws = wb.Sheets[targetName];
  if (!ws) {
    throw new Error("Selected worksheet could not be read.");
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  if (rawRows.length > maxRows) {
    throw new Error(
      `Spreadsheet contains more than ${maxRows.toLocaleString()} rows. Please split it into smaller batches.`
    );
  }

  return rawRows.map((row) => sanitizeRow(row, maxCols));
}

export async function parseSpreadsheetFile(
  file: File,
  options: ParseSpreadsheetOptions = {}
): Promise<Record<string, unknown>[]> {
  const maxBytes = options.maxBytes ?? MAX_SPREADSHEET_BYTES;
  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Spreadsheet "${file.name}" exceeds the ${mb} MB upload limit.`);
  }
  const buffer = await file.arrayBuffer();
  return parseSpreadsheetBuffer(buffer, options);
}

export interface WorkbookSheetSpec {
  name: string;
  rows: Record<string, unknown>[];
}

export async function downloadWorkbook(
  sheets: WorkbookSheetSpec[],
  filename: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const safeName = (sheet.name || "Sheet").slice(0, 31);
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}
