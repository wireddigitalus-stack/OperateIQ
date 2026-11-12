/**
 * Hardened, dynamically-loaded spreadsheet helper wrapping local SheetJS (xlsx 0.20.3).
 *
 * - Dynamically imports `xlsx` on demand so the ~400 kB library is never included
 *   in initial page bundles.
 * - Enforces file size, sheet count, row count, and column count caps.
 * - Disables formula and HTML evaluation (`cellFormula: false`, `cellHTML: false`).
 * - Strips dangerous prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
 *   from every parsed row.
 * - Smartly detects real header rows (skipping AppFolio / Buildium / QuickBooks report
 *   title banners) and filters out bottom "Total / Subtotal / Summary" rows.
 */

export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_SPREADSHEET_SHEETS = 15;
export const MAX_SPREADSHEET_ROWS = 2500;
export const MAX_SPREADSHEET_COLS = 60;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Real-estate & CRM header tokens used to score candidate header rows
const HEADER_KEYWORD_TOKENS = [
  "tenant",
  "resident",
  "lessee",
  "occupant",
  "customer",
  "client",
  "company",
  "business",
  "name",
  "contact",
  "lead",
  "unit",
  "apt",
  "apartment",
  "suite",
  "space",
  "bay",
  "room",
  "building",
  "property",
  "community",
  "complex",
  "address",
  "city",
  "rent",
  "charge",
  "rate",
  "monthly",
  "base rent",
  "market rent",
  "deposit",
  "security",
  "escrow",
  "nnn",
  "cam",
  "pet",
  "utility",
  "utilities",
  "escalation",
  "sqft",
  "sq ft",
  "rsf",
  "lease",
  "start",
  "move in",
  "move-in",
  "end",
  "expir",
  "maturity",
  "move out",
  "move-out",
  "email",
  "e-mail",
  "phone",
  "mobile",
  "cell",
  "tel",
  "status",
  "notes",
  "comments",
  "remarks",
  "budget",
  "timeline",
  "score",
];

// Sheet tab names likely to hold the rent roll or roster
const PREFERRED_SHEET_PATTERNS = [
  /rent\s*roll/i,
  /tenants?/i,
  /residents?/i,
  /leases?/i,
  /roster/i,
  /units?/i,
  /leads?/i,
];

const SUMMARY_LABEL_REGEX =
  /^(grand\s+total|sub[-\s]?total|portfolio\s+total|building\s+total|property\s+total|page\s+total|totals?|summary|report\s+total|average|avg)\b/i;

const BANNER_LINE_REGEX =
  /\b(rent\s+roll\s+as\s+of|as\s+of\s+\d|prepared\s+(by|for)|generated\s+on|confidential|page\s+\d+\s+of)\b/i;

export interface ParseSpreadsheetOptions {
  maxBytes?: number;
  maxRows?: number;
  maxCols?: number;
  sheetIndex?: number;
  /** Set false to force Row 1 as headers without smart banner detection */
  smartHeaders?: boolean;
}

export interface SpreadsheetInspectionResult {
  sheetNames: string[];
  selectedSheetIndex: number;
  selectedSheetName: string;
  detectedHeaderRowIndex: number; // 0-based index in the worksheet
  skippedBannerRows: number;
  skippedSummaryRows: number;
  headers: string[];
  rows: Record<string, unknown>[];
}

function isSafeKey(key: string): boolean {
  return Boolean(key) && !FORBIDDEN_KEYS.has(key) && !FORBIDDEN_KEYS.has(key.toLowerCase());
}

function sanitizeRow(raw: Record<string, unknown>, maxCols: number): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  let colCount = 0;
  for (const [rawKey, value] of Object.entries(raw)) {
    const key = String(rawKey).trim();
    if (!isSafeKey(key)) continue;
    if (colCount >= maxCols) break;
    colCount++;
    clean[key] = value;
  }
  return clean;
}

/**
 * Scores a 1D array of raw cell values for likelihood of being the table header row.
 */
function scoreHeaderCandidate(cells: unknown[]): number {
  let nonEmpty = 0;
  let textCells = 0;
  let numericOnlyCells = 0;
  let keywordHits = 0;
  const seenStrings = new Set<string>();

  for (const cell of cells) {
    const str = String(cell ?? "").trim();
    if (!str) continue;
    nonEmpty++;

    // Pure number / currency / ISO date cells look like data, not headers
    if (
      typeof cell === "number" ||
      /^[$€£]?\s*-?\d[\d,]*(\.\d+)?%?$/.test(str) ||
      /^\d{4}-\d{2}-\d{2}$/.test(str) ||
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)
    ) {
      numericOnlyCells++;
      continue;
    }

    if (str.length > 65 || BANNER_LINE_REGEX.test(str)) {
      // Long prose or "Rent Roll As Of..." banner
      return -10;
    }

    textCells++;
    const lower = str.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    seenStrings.add(lower);

    if (
      HEADER_KEYWORD_TOKENS.some(
        (tok) => lower === tok || lower.startsWith(`${tok} `) || lower.endsWith(` ${tok}`) || lower.includes(tok)
      )
    ) {
      keywordHits++;
    }
  }

  if (nonEmpty < 2 || textCells < 2) return -5;
  // Penalize rows that are mostly numbers (likely data rows) or duplicate merged labels
  const uniquenessBonus = seenStrings.size === textCells ? 2 : 0;
  return keywordHits * 5 + textCells * 1.5 - numericOnlyCells * 3 + uniquenessBonus;
}

/**
 * Detects whether a row is a bottom "Total / Subtotal / Summary" row rather than a real record.
 */
export function isSummaryOrTotalRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row)
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  if (values.length === 0) return true;

  // Check first 3 populated cells for "Total", "Subtotal", "Grand Total", etc.
  for (let i = 0; i < Math.min(3, values.length); i++) {
    const cell = values[i];
    if (SUMMARY_LABEL_REGEX.test(cell)) {
      return true;
    }
  }
  return false;
}

/**
 * Parses money / currency strings while preserving cents to 2 decimal places (e.g. "$82.50" -> 82.5).
 */
export function parseCleanMoney(val: unknown): number {
  if (typeof val === "number") {
    return Number.isFinite(val) ? Math.max(0, Math.round(val * 100) / 100) : 0;
  }
  if (val === null || val === undefined) return 0;
  let str = String(val).trim();
  if (!str) return 0;

  // Strip trailing frequency suffixes like "/mo", "per month", "monthly"
  str = str.replace(/\s*(\/|per\s+)(mo|month|yr|year|annum).*$/i, "");
  const isParenNegative = /^\(.*\)$/.test(str);
  const cleaned = str.replace(/[^0-9.-]/g, "");
  if (!cleaned) return 0;

  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  const signed = isParenNegative ? -Math.abs(parsed) : parsed;
  return Math.max(0, Math.round(signed * 100) / 100);
}

const MONTH_INDEX: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Timezone-safe date normalizer -> "YYYY-MM-DD" or "".
 * Supports Excel serial dates, ISO YYYY-MM-DD, US MM/DD/YYYY or M/D/YY, and "Nov 1, 2024".
 */
export function normalizeFlexibleDate(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";

  // 1. Excel serial date number (e.g. 45658 -> 2025-01-01 in UTC)
  if (typeof val === "number" && Number.isFinite(val)) {
    if (val > 25569 && val < 80000) {
      const utcMs = Math.round((val - 25569) * 86400 * 1000);
      const d = new Date(utcMs);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    return "";
  }

  const s = String(val).trim();
  if (!s) return "";

  // Numeric string that is actually an Excel serial
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial > 25569 && serial < 80000) {
      const utcMs = Math.round((serial - 25569) * 86400 * 1000);
      return new Date(utcMs).toISOString().slice(0, 10);
    }
  }

  // 2. ISO YYYY-MM-DD (or YYYY/MM/DD or ISO timestamp)
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (isValidYmd(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // 3. US MM/DD/YYYY or M-D-YY
  const usMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usMatch) {
    let m = Number(usMatch[1]);
    let d = Number(usMatch[2]);
    let y = Number(usMatch[3]);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    // If first part > 12 and second <= 12, treat as DD/MM/YYYY
    if (m > 12 && d <= 12) {
      const tmp = m;
      m = d;
      d = tmp;
    }
    if (isValidYmd(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // 4. Written month ("November 1, 2024", "1 Nov 2024", "Aug 01 2025")
  const monthFirst = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (monthFirst) {
    const m = MONTH_INDEX[monthFirst[1].toLowerCase()];
    const d = Number(monthFirst[2]);
    const y = Number(monthFirst[3]);
    if (m && isValidYmd(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  const dayFirst = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})$/);
  if (dayFirst) {
    const d = Number(dayFirst[1]);
    const m = MONTH_INDEX[dayFirst[2].toLowerCase()];
    const y = Number(dayFirst[3]);
    if (m && isValidYmd(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  return "";
}

/**
 * Inspects a spreadsheet buffer with smart worksheet & header-row detection.
 */
export async function inspectSpreadsheetBuffer(
  buffer: ArrayBuffer | Uint8Array,
  options: ParseSpreadsheetOptions = {}
): Promise<SpreadsheetInspectionResult> {
  const maxBytes = options.maxBytes ?? MAX_SPREADSHEET_BYTES;
  const maxRows = options.maxRows ?? MAX_SPREADSHEET_ROWS;
  const maxCols = options.maxCols ?? MAX_SPREADSHEET_COLS;
  const smartHeaders = options.smartHeaders !== false;

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
    sheetRows: maxRows + 25, // headroom for title banners + summary rows
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("No worksheets were found in the uploaded file.");
  }
  if (wb.SheetNames.length > MAX_SPREADSHEET_SHEETS) {
    throw new Error(
      `Workbook has ${wb.SheetNames.length} sheets (maximum supported is ${MAX_SPREADSHEET_SHEETS}).`
    );
  }

  // Filter to non-empty sheets (or keep all if only 1)
  const sheetNames = wb.SheetNames;

  // Choose target sheet: explicit options.sheetIndex wins; otherwise score sheets by name + header quality
  let selectedSheetIndex = 0;
  if (typeof options.sheetIndex === "number" && options.sheetIndex >= 0) {
    selectedSheetIndex = Math.min(options.sheetIndex, sheetNames.length - 1);
  } else if (sheetNames.length > 1 && smartHeaders) {
    let bestSheetScore = -Infinity;
    sheetNames.forEach((sName, idx) => {
      const wsCandidate = wb.Sheets[sName];
      if (!wsCandidate) return;
      const previewMatrix = XLSX.utils.sheet_to_json<unknown[]>(wsCandidate, {
        header: 1,
        defval: "",
        raw: true,
      });
      if (previewMatrix.length < 2) return;
      let maxRowScore = -10;
      for (let r = 0; r < Math.min(15, previewMatrix.length); r++) {
        maxRowScore = Math.max(maxRowScore, scoreHeaderCandidate(previewMatrix[r] || []));
      }
      const nameBonus = PREFERRED_SHEET_PATTERNS.some((rx) => rx.test(sName)) ? 12 : 0;
      const totalScore = maxRowScore + nameBonus;
      if (totalScore > bestSheetScore) {
        bestSheetScore = totalScore;
        selectedSheetIndex = idx;
      }
    });
  }

  const selectedSheetName = sheetNames[selectedSheetIndex];
  const ws = wb.Sheets[selectedSheetName];
  if (!ws) {
    throw new Error("Selected worksheet could not be read.");
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (matrix.length === 0) {
    return {
      sheetNames,
      selectedSheetIndex,
      selectedSheetName,
      detectedHeaderRowIndex: 0,
      skippedBannerRows: 0,
      skippedSummaryRows: 0,
      headers: [],
      rows: [],
    };
  }

  // Detect true header row within the first 20 rows
  let headerRowIdx = 0;
  if (smartHeaders) {
    let bestScore = -Infinity;
    const scanLimit = Math.min(20, matrix.length);
    for (let r = 0; r < scanLimit; r++) {
      const rowCells = (matrix[r] || []).slice(0, maxCols);
      const score = scoreHeaderCandidate(rowCells);
      if (score > bestScore) {
        bestScore = score;
        headerRowIdx = r;
      }
    }
    // If every row scored poorly, fall back to first non-empty row
    if (bestScore < 0) {
      headerRowIdx = Math.max(
        0,
        matrix.findIndex((row) => (row || []).some((c) => String(c ?? "").trim() !== ""))
      );
    }
  }

  const rawHeaderCells = (matrix[headerRowIdx] || []).slice(0, maxCols);
  const headers: string[] = [];
  const colIndexToHeader = new Map<number, string>();
  const usedHeaders = new Map<string, number>();

  rawHeaderCells.forEach((cell, colIdx) => {
    const base = String(cell ?? "")
      .replace(/\r?\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!base || !isSafeKey(base)) return;

    const count = usedHeaders.get(base.toLowerCase()) || 0;
    usedHeaders.set(base.toLowerCase(), count + 1);
    const finalHeader = count === 0 ? base : `${base} (${count + 1})`;
    headers.push(finalHeader);
    colIndexToHeader.set(colIdx, finalHeader);
  });

  const dataRowsRaw = matrix.slice(headerRowIdx + 1);
  const rows: Record<string, unknown>[] = [];
  let skippedSummaryRows = 0;

  for (const rawCells of dataRowsRaw) {
    if (!Array.isArray(rawCells)) continue;

    let hasAnyValue = false;
    const obj: Record<string, unknown> = {};

    for (const [colIdx, headerName] of colIndexToHeader.entries()) {
      const val = rawCells[colIdx] ?? "";
      if (String(val).trim() !== "") {
        hasAnyValue = true;
      }
      obj[headerName] = val;
    }

    if (!hasAnyValue) continue;

    if (smartHeaders && isSummaryOrTotalRow(obj)) {
      skippedSummaryRows++;
      continue;
    }

    rows.push(sanitizeRow(obj, maxCols));
    if (rows.length > maxRows) {
      throw new Error(
        `Spreadsheet contains more than ${maxRows.toLocaleString()} rows. Please split it into smaller batches.`
      );
    }
  }

  return {
    sheetNames,
    selectedSheetIndex,
    selectedSheetName,
    detectedHeaderRowIndex: headerRowIdx,
    skippedBannerRows: headerRowIdx,
    skippedSummaryRows,
    headers,
    rows,
  };
}

export async function inspectSpreadsheetFile(
  file: File,
  options: ParseSpreadsheetOptions = {}
): Promise<SpreadsheetInspectionResult> {
  const maxBytes = options.maxBytes ?? MAX_SPREADSHEET_BYTES;
  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Spreadsheet "${file.name}" exceeds the ${mb} MB upload limit.`);
  }
  const buffer = await file.arrayBuffer();
  return inspectSpreadsheetBuffer(buffer, options);
}

export async function parseSpreadsheetBuffer(
  buffer: ArrayBuffer | Uint8Array,
  options: ParseSpreadsheetOptions = {}
): Promise<Record<string, unknown>[]> {
  const result = await inspectSpreadsheetBuffer(buffer, options);
  return result.rows;
}

export async function parseSpreadsheetFile(
  file: File,
  options: ParseSpreadsheetOptions = {}
): Promise<Record<string, unknown>[]> {
  const result = await inspectSpreadsheetFile(file, options);
  return result.rows;
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

/**
 * Generates and downloads a clean PropOpsIQ Rent Roll starter .xlsx template
 * covering Commercial NNN, Multi-Family Apartment, and Single-Family Residence examples.
 */
export async function downloadRentRollTemplate(): Promise<void> {
  await downloadWorkbook(
    [
      {
        name: "Rent Roll Import",
        rows: [
          {
            "Tenant Name": "Summit Tech LLC",
            "Co-Tenant / Contact": "Jane Doe (Guarantor)",
            Building: "Apex Plaza",
            "Property Type": "Commercial",
            City: "Metropolis",
            "Unit / Suite": "Suite 100",
            SqFt: 2400,
            "Base Monthly Rent": 5200,
            "NNN / CAM Fee": 450,
            "Pet / Other Monthly Fee": 0,
            "Security Deposit": 10400,
            "Annual Escalation %": 3,
            "Lease Start": "2025-01-01",
            "Lease End": "2029-12-31",
            Email: "ap@summittech.example.com",
            Phone: "555-0140",
            Notes: "14.2% NNN share · 3% annual escalation",
          },
          {
            "Tenant Name": "Jordan Miller",
            "Co-Tenant / Contact": "",
            Building: "Oakview Apartments",
            "Property Type": "Multi-Family",
            City: "Oakview",
            "Unit / Suite": "Unit 2B",
            SqFt: 920,
            "Base Monthly Rent": 1650,
            "NNN / CAM Fee": 0,
            "Pet / Other Monthly Fee": 35,
            "Security Deposit": 1650,
            "Annual Escalation %": 0,
            "Lease Start": "2026-08-01",
            "Lease End": "2027-07-31",
            Email: "jordan.m@example.com",
            Phone: "555-0188",
            Notes: "Pet rent $35/mo + $250 non-refundable pet deposit · 5% late fee after 5th",
          },
          {
            "Tenant Name": "Marcus Vance",
            "Co-Tenant / Contact": "Sarah Vance",
            Building: "742 Evergreen Terrace",
            "Property Type": "Single-Family",
            City: "Springfield",
            "Unit / Suite": "Main",
            SqFt: 1950,
            "Base Monthly Rent": 2400,
            "NNN / CAM Fee": 0,
            "Pet / Other Monthly Fee": 50,
            "Security Deposit": 3000,
            "Annual Escalation %": 0,
            "Lease Start": "2026-11-01",
            "Lease End": "2027-10-31",
            Email: "m.vance@example.com",
            Phone: "555-0192",
            Notes: "$50/mo landscaping fee · HVAC air filters every 60 days",
          },
        ],
      },
    ],
    "PropOpsIQ-Rent-Roll-Template.xlsx"
  );
}
