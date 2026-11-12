import { inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";
import { normalizeFlexibleDate, parseCleanMoney } from "@/lib/spreadsheet";

export type PropertyAssetType = "Commercial" | "Multi-Family" | "Single-Family" | "Mixed-Use";

export interface ExtractedTenantCandidate {
  id: string;
  name: string;
  contactName: string;
  guarantor: string;
  email: string;
  phone: string;
  building: string;
  propertyAddress: string;
  propertyCity: string;
  propertyType: PropertyAssetType;
  unit: string;
  unitSqft: number;
  beds: number;
  baths: number;
  monthlyRent: number;
  nnnFee: number;
  camFee: number;
  utilitiesFee: number;
  utilitiesFeeLabel: string;
  cleaningFee: number;
  securityDeposit: number;
  nonRefundableDeposit: number;
  secDepReceived: boolean;
  secDepNotes: string;
  escalationPct: number;
  escalationDate: string;
  lateFeeRule: string;
  hvacFilterIntervalDays: number;
  leaseStart: string;
  leaseEnd: string;
  status: "active" | "pending" | "expired";
  isExpiredHoldover: boolean;
  sourceDocUrl: string;
  sourceDocName: string;
  notes: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  selected: boolean;
}

/**
 * Masks full 9-digit US Social Security Numbers while preserving business EINs (XX-XXXXXXX),
 * phone numbers (XXX-XXX-XXXX), dates (YYYY-MM-DD), and partial last-4 SSNs ("ending 8812").
 */
export function redactSensitivePii(input: string): string {
  if (!input) return "";
  return input
    .replace(
      /\b(SSN|Social\s+Security(?:\s*(?:No\.?|Number|#))?)\s*([:#\-]?)\s*(?!000|666|9\d\d)\d{3}[\s\-]?\d{2}[\s\-]?(\d{4})\b/gi,
      (_, label: string, sep: string, last4: string) => `${label}${sep ? `${sep} ` : " "}***-**-${last4}`
    )
    .replace(
      /\b(?!000|666|9\d\d)\d{3}-\d{2}-(\d{4})\b/g,
      "***-**-$1"
    );
}

export function inferLeaseStatus(
  leaseStart: string,
  leaseEnd: string,
  todayIso: string = new Date().toISOString().slice(0, 10)
): { status: "active" | "pending" | "expired"; isExpiredHoldover: boolean } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(leaseEnd) && leaseEnd < todayIso) {
    return { status: "expired", isExpiredHoldover: true };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(leaseStart) && leaseStart > todayIso) {
    return { status: "pending", isExpiredHoldover: false };
  }
  return { status: "active", isExpiredHoldover: false };
}

export function computeFirstEscalationDate(
  leaseStart: string,
  explicitDate?: string
): string {
  const normExplicit = normalizeFlexibleDate(explicitDate);
  if (normExplicit) return normExplicit;
  const normStart = normalizeFlexibleDate(leaseStart);
  if (!normStart) return "";
  const [y, m, d] = normStart.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function normalizePropertyType(raw: unknown): PropertyAssetType {
  const s = String(raw || "").toLowerCase().trim();
  if (s.includes("commercial") || s.includes("office") || s.includes("retail") || s.includes("industrial") || s.includes("nnn")) {
    return "Commercial";
  }
  if (s.includes("single") || s.includes("sfr") || s.includes("house") || s.includes("residence")) {
    return "Single-Family";
  }
  if (s.includes("multi") || s.includes("apartment") || s.includes("duplex") || s.includes("condo")) {
    return "Multi-Family";
  }
  return "Mixed-Use";
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function wordXmlToText(xml: string): string {
  const withBreaks = xml
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g, "\n")
    .replace(/<\/w:(?:p|tr)>/g, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeXmlEntities(stripped)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Zero-dependency .docx text extractor using Node's built-in zlib.
 * Reads Central Directory entries from the ZIP buffer and inflates word/*.xml.
 */
export function extractDocxText(buf: Buffer): string {
  const minEocdOffset = Math.max(0, buf.length - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= minEocdOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Invalid .docx archive (missing ZIP central directory).");
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const xmlEntries: { name: string; text: string }[] = [];
  let pos = cdOffset;

  for (let idx = 0; idx < totalEntries && pos + 46 <= buf.length; idx++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const compressionMethod = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const fileNameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const entryName = buf.subarray(pos + 46, pos + 46 + fileNameLen).toString("utf8");
    pos += 46 + fileNameLen + extraLen + commentLen;

    if (!/^word\/(header\d*|document|footer\d*|footnotes|endnotes)\.xml$/i.test(entryName)) {
      continue;
    }
    if (localHeaderOffset + 30 > buf.length || buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      continue;
    }

    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + compressedSize > buf.length) continue;

    const compressedSlice = buf.subarray(dataStart, dataStart + compressedSize);
    let xmlBuf: Buffer | null = null;
    if (compressionMethod === 0) {
      xmlBuf = compressedSlice;
    } else if (compressionMethod === 8) {
      xmlBuf = inflateRawSync(compressedSlice);
    }
    if (xmlBuf) {
      const text = wordXmlToText(xmlBuf.toString("utf8"));
      if (text) xmlEntries.push({ name: entryName, text });
    }
  }

  xmlEntries.sort((a, b) => {
    const rank = (n: string) =>
      n.includes("header") ? 0 : n.includes("document.xml") ? 1 : 2;
    return rank(a.name) - rank(b.name);
  });

  return redactSensitivePii(xmlEntries.map((e) => e.text).join("\n\n").trim());
}

/** Extracts readable text runs from legacy binary .doc (OLE2 Word 97-2003) files. */
export function extractLegacyDocText(buf: Buffer): string {
  const chunks: string[] = [];

  const latin = buf.toString("latin1");
  const asciiMatches = latin.match(/[A-Za-z0-9$.,:/()\-'"@#&%\t\r\n ]{6,}/g) || [];
  for (const m of asciiMatches) {
    const cleaned = m.trim();
    if (
      cleaned.length >= 6 &&
      /[A-Za-z0-9]/.test(cleaned) &&
      !/^(Root Entry|WordDocument|CompObj|SummaryInformation|DocumentSummaryInformation|Microsoft Word)/i.test(cleaned)
    ) {
      chunks.push(cleaned);
    }
  }

  let u16Run = "";
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const code = buf.readUInt16LE(i);
    if (code === 0x000d || code === 0x000a) {
      u16Run += "\n";
    } else if (code === 0x0009) {
      u16Run += "\t";
    } else if (code >= 0x0020 && code <= 0x007e) {
      u16Run += String.fromCharCode(code);
    } else {
      if (u16Run.trim().length >= 8 && /[A-Za-z]/.test(u16Run)) {
        chunks.push(u16Run.trim());
      }
      u16Run = "";
    }
  }
  if (u16Run.trim().length >= 8 && /[A-Za-z]/.test(u16Run)) {
    chunks.push(u16Run.trim());
  }

  return redactSensitivePii(chunks.join("\n").slice(0, 120_000).trim());
}

export function extractRtfText(rtf: string): string {
  const raw = rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\'[0-9a-fA-F]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16)))
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return redactSensitivePii(raw);
}

export function extractSpreadsheetText(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false }).trim();
    if (csv) {
      parts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
  }
  return redactSensitivePii(parts.join("\n\n").slice(0, 120_000).trim());
}

export type PreparedInput =
  | { kind: "inline"; mimeType: string; base64Data: string }
  | { kind: "text"; extractedText: string; sourceFormat: string };

export function prepareDocumentForGemini(
  buf: Buffer,
  rawMimeType: string,
  filename: string
): PreparedInput {
  const lowerName = filename.toLowerCase().trim();
  const mime = rawMimeType.toLowerCase().trim();

  const isPdfMagic = buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
  const isPngMagic =
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;
  const isJpegMagic = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isWebpMagic =
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP";
  const isGifMagic =
    buf.length >= 6 &&
    (buf.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buf.subarray(0, 6).toString("ascii") === "GIF89a");
  const isZipMagic =
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04;
  const isOleMagic =
    buf.length >= 4 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0;

  if (isPdfMagic || lowerName.endsWith(".pdf") || mime === "application/pdf") {
    return { kind: "inline", mimeType: "application/pdf", base64Data: buf.toString("base64") };
  }

  if (isPngMagic) {
    return { kind: "inline", mimeType: "image/png", base64Data: buf.toString("base64") };
  }
  if (isJpegMagic) {
    return { kind: "inline", mimeType: "image/jpeg", base64Data: buf.toString("base64") };
  }
  if (isWebpMagic) {
    return { kind: "inline", mimeType: "image/webp", base64Data: buf.toString("base64") };
  }
  if (isGifMagic) {
    return { kind: "inline", mimeType: "image/gif", base64Data: buf.toString("base64") };
  }

  if (
    isZipMagic ||
    lowerName.endsWith(".docx") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    if (
      lowerName.endsWith(".xlsx") ||
      lowerName.endsWith(".xlsm") ||
      mime.includes("spreadsheetml")
    ) {
      const text = extractSpreadsheetText(buf);
      return { kind: "text", extractedText: text, sourceFormat: "Excel Workbook (.xlsx)" };
    }
    try {
      const docxText = extractDocxText(buf);
      if (docxText) {
        return { kind: "text", extractedText: docxText.slice(0, 120_000), sourceFormat: "Word Document (.docx)" };
      }
    } catch {
      try {
        const sheetText = extractSpreadsheetText(buf);
        if (sheetText) {
          return { kind: "text", extractedText: sheetText, sourceFormat: "Spreadsheet" };
        }
      } catch {
        /* fall through */
      }
    }
    throw new Error("Could not extract readable text from this .docx file. Please save as PDF and try again.");
  }

  if (
    isOleMagic ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".xls") ||
    mime === "application/msword" ||
    mime === "application/vnd.ms-excel"
  ) {
    if (lowerName.endsWith(".xls") || mime === "application/vnd.ms-excel") {
      const sheetText = extractSpreadsheetText(buf);
      return { kind: "text", extractedText: sheetText, sourceFormat: "Excel Spreadsheet (.xls)" };
    }
    const legacyText = extractLegacyDocText(buf);
    if (!legacyText) {
      throw new Error("Could not read this legacy .doc file. Please save it as .docx or PDF and retry.");
    }
    return { kind: "text", extractedText: legacyText, sourceFormat: "Word Document (.doc)" };
  }

  if (
    lowerName.endsWith(".rtf") ||
    mime === "application/rtf" ||
    mime === "text/rtf" ||
    buf.subarray(0, 5).toString("ascii") === "{\\rtf"
  ) {
    const rtfText = extractRtfText(buf.toString("latin1"));
    return { kind: "text", extractedText: rtfText.slice(0, 120_000), sourceFormat: "Rich Text (.rtf)" };
  }

  if (mime.startsWith("text/") || /\.(txt|csv|tsv|md)$/i.test(lowerName)) {
    return {
      kind: "text",
      extractedText: redactSensitivePii(buf.toString("utf8").slice(0, 120_000)),
      sourceFormat: "Text / CSV Document",
    };
  }

  if (mime.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(lowerName)) {
    const resolvedImageMime = mime.startsWith("image/")
      ? mime
      : lowerName.endsWith(".png")
        ? "image/png"
        : lowerName.endsWith(".webp")
          ? "image/webp"
          : lowerName.endsWith(".heic")
            ? "image/heic"
            : lowerName.endsWith(".heif")
              ? "image/heif"
              : "image/jpeg";
    return { kind: "inline", mimeType: resolvedImageMime, base64Data: buf.toString("base64") };
  }

  throw new Error(
    `Unsupported file format (${filename}). Please upload a PDF, Word document (.docx), Excel/CSV spreadsheet, or photo (JPG/PNG/HEIC).`
  );
}

export function normalizeExtractedCandidate(
  r: Record<string, unknown>,
  idx: number,
  opts: {
    totalRecords: number;
    detectedBuildingName: string;
    sourceDocUrl: string;
    sourceDocName: string;
    todayIso?: string;
  }
): ExtractedTenantCandidate {
  const name = redactSensitivePii(String(r.name || "").trim());
  const monthlyRent = parseCleanMoney(r.monthlyRent);
  const nnnFee = parseCleanMoney(r.nnnFee);
  const camFee = parseCleanMoney(r.camFee);
  const utilitiesFee = parseCleanMoney(r.utilitiesFee ?? r.petRent ?? r.otherMonthlyFee);
  const utilitiesFeeLabel = redactSensitivePii(String(r.utilitiesFeeLabel || "").trim());
  const cleaningFee = parseCleanMoney(r.cleaningFee);
  const securityDeposit = parseCleanMoney(r.securityDeposit);
  const nonRefundableDeposit = parseCleanMoney(r.nonRefundableDeposit);

  // Prevent multi-property packet bleed: only inherit detectedBuildingName if this record has none AND it's a 1-building doc
  const rawBuilding = String(r.building || "").trim();
  const building =
    rawBuilding ||
    (opts.totalRecords === 1 ? opts.detectedBuildingName : "") ||
    "Main Building";

  const propertyType = normalizePropertyType(r.propertyType);
  const rawUnit = String(r.unit || "").trim();
  const unit =
    rawUnit ||
    (propertyType === "Single-Family" ? "Main" : opts.totalRecords === 1 ? "Unit 1" : `Unit ${idx + 1}`);

  const leaseStart = normalizeFlexibleDate(r.leaseStart);
  const leaseEnd = normalizeFlexibleDate(r.leaseEnd);
  const { status, isExpiredHoldover } = inferLeaseStatus(leaseStart, leaseEnd, opts.todayIso);

  const escalationPct = Math.max(0, Math.round((Number(r.escalationPct) || 0) * 100) / 100);
  const escalationDate =
    escalationPct > 0 ? computeFirstEscalationDate(leaseStart, String(r.escalationDate || "")) : "";

  const guarantor = redactSensitivePii(String(r.guarantor || "").trim());
  const rawContact = redactSensitivePii(String(r.contactName || r.coTenants || "").trim());
  const contactName =
    rawContact && guarantor && !rawContact.toLowerCase().includes(guarantor.toLowerCase())
      ? `${rawContact} · Guarantor: ${guarantor}`
      : rawContact || (guarantor ? `Guarantor: ${guarantor}` : "");

  const lateFeeRule = redactSensitivePii(String(r.lateFeeRule || "").trim());
  const hvacFilterIntervalDays = Math.max(0, Math.round(Number(r.hvacFilterIntervalDays) || 0));

  // Build structured, readable notes preserving key lease rules without losing anything
  const baseNotes = redactSensitivePii(String(r.notes || "").trim());
  const noteChips: string[] = [];
  if (utilitiesFee > 0 && utilitiesFeeLabel && !baseNotes.toLowerCase().includes(utilitiesFeeLabel.toLowerCase())) {
    noteChips.push(`${utilitiesFeeLabel}: $${utilitiesFee}/mo`);
  }
  if (nonRefundableDeposit > 0 && !baseNotes.toLowerCase().includes("non-refundable")) {
    noteChips.push(`Non-refundable fee/deposit: $${nonRefundableDeposit}`);
  }
  if (lateFeeRule && !baseNotes.toLowerCase().includes("late")) {
    noteChips.push(`Late fee: ${lateFeeRule}`);
  }
  if (hvacFilterIntervalDays > 0 && !baseNotes.toLowerCase().includes("hvac") && !baseNotes.toLowerCase().includes("filter")) {
    noteChips.push(`HVAC filters every ${hvacFilterIntervalDays} days`);
  }
  const combinedNotes = [...noteChips, baseNotes].filter(Boolean).join(" · ");

  const secDepNotesRaw = redactSensitivePii(String(r.secDepNotes || "").trim());
  const secDepNotes =
    nonRefundableDeposit > 0 && !secDepNotesRaw.includes(String(nonRefundableDeposit))
      ? [secDepNotesRaw, `+$${nonRefundableDeposit} non-refundable deposit`].filter(Boolean).join(" · ")
      : secDepNotesRaw;

  const isMissingCritical = !name || monthlyRent <= 0;
  const needsReview = Boolean(r.needsReview) || isMissingCritical;

  return {
    id: `candidate_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || `Tenant ${idx + 1}`,
    contactName,
    guarantor,
    email: String(r.email || "").trim(),
    phone: String(r.phone || "").trim(),
    building,
    propertyAddress: String(r.propertyAddress || "").trim(),
    propertyCity: String(r.propertyCity || "").trim(),
    propertyType,
    unit,
    unitSqft: Math.max(0, Math.round(Number(r.unitSqft) || 0)),
    beds: Math.max(0, Number(r.beds) || 0),
    baths: Math.max(0, Number(r.baths) || 0),
    monthlyRent,
    nnnFee,
    camFee,
    utilitiesFee,
    utilitiesFeeLabel,
    cleaningFee,
    securityDeposit,
    nonRefundableDeposit,
    secDepReceived: Boolean(r.secDepReceived),
    secDepNotes,
    escalationPct,
    escalationDate,
    lateFeeRule,
    hvacFilterIntervalDays,
    leaseStart,
    leaseEnd,
    status,
    isExpiredHoldover,
    sourceDocUrl: opts.sourceDocUrl,
    sourceDocName: opts.sourceDocName,
    notes: combinedNotes,
    confidence:
      (r.confidence as "high" | "medium" | "low") ||
      (isMissingCritical ? "low" : "high"),
    needsReview,
    selected: opts.totalRecords === 1 ? Boolean(name) : !isMissingCritical,
  };
}
