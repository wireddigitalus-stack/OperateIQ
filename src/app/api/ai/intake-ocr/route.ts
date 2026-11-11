import { NextRequest, NextResponse } from "next/server";
import { inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";
import { checkAiQuota } from "@/lib/rateLimit";
import { requireOrg } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface ExtractedTenantCandidate {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  monthlyRent: number;
  securityDeposit: number;
  leaseStart: string;
  leaseEnd: string;
  notes: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  selected: boolean;
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
function extractDocxText(buf: Buffer): string {
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

  // Order headers -> main document -> footers/notes
  xmlEntries.sort((a, b) => {
    const rank = (n: string) =>
      n.includes("header") ? 0 : n.includes("document.xml") ? 1 : 2;
    return rank(a.name) - rank(b.name);
  });

  return xmlEntries.map((e) => e.text).join("\n\n").trim();
}

/** Extracts readable text runs from legacy binary .doc (OLE2 Word 97-2003) files. */
function extractLegacyDocText(buf: Buffer): string {
  const chunks: string[] = [];

  // 1. ASCII printable runs
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

  // 2. UTF-16LE printable runs (common in Word 97-2003 Unicode piece tables)
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

  return chunks.join("\n").slice(0, 120_000).trim();
}

function extractRtfText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\'[0-9a-fA-F]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16)))
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSpreadsheetText(buf: Buffer): string {
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
  return parts.join("\n\n").slice(0, 120_000).trim();
}

type PreparedInput =
  | { kind: "inline"; mimeType: string; base64Data: string }
  | { kind: "text"; extractedText: string; sourceFormat: string };

function prepareDocumentForGemini(
  buf: Buffer,
  rawMimeType: string,
  filename: string
): PreparedInput {
  const lowerName = filename.toLowerCase().trim();
  const mime = rawMimeType.toLowerCase().trim();

  // 1. Check binary magic bytes first so missing/wrong browser MIME types never fool Gemini
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

  // Word .docx or Excel .xlsx (both are PKZIP containers)
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
      // If it's actually an xlsx renamed or another zip spreadsheet, try SheetJS
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

  // Legacy .doc or .xls (OLE2 containers)
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

  // RTF documents
  if (
    lowerName.endsWith(".rtf") ||
    mime === "application/rtf" ||
    mime === "text/rtf" ||
    buf.subarray(0, 5).toString("ascii") === "{\\rtf"
  ) {
    const rtfText = extractRtfText(buf.toString("latin1"));
    return { kind: "text", extractedText: rtfText.slice(0, 120_000), sourceFormat: "Rich Text (.rtf)" };
  }

  // Plain text / CSV / TSV
  if (
    mime.startsWith("text/") ||
    /\.(txt|csv|tsv|md)$/i.test(lowerName)
  ) {
    return {
      kind: "text",
      extractedText: buf.toString("utf8").slice(0, 120_000),
      sourceFormat: "Text / CSV Document",
    };
  }

  // HEIC / HEIF or other Gemini-supported images
  if (mime.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(lowerName)) {
    const resolvedImageMime =
      mime.startsWith("image/")
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

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(stripped) as Record<string, unknown>;
    } catch {
      const firstBrace = stripped.indexOf("{");
      const lastBrace = stripped.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(stripped.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      }
      throw new Error("AI response did not contain valid JSON.");
    }
  }
}

async function runGeminiWithFallback(
  apiKey: string,
  systemInstruction: string,
  prepared: PreparedInput
): Promise<Record<string, unknown>> {
  const userParts =
    prepared.kind === "text"
      ? [
          {
            text: `Extract all tenant / lease records from this ${prepared.sourceFormat}:\n\n${prepared.extractedText}`,
          },
        ]
      : [
          {
            text: "Inspect this uploaded lease / rent-roll document and extract every tenant record into the required JSON structure.",
          },
          {
            inlineData: {
              mimeType: prepared.mimeType,
              data: prepared.base64Data,
            },
          },
        ];

  const attempts: Array<{
    model: string;
    jsonMode: boolean;
    disableThinking: boolean;
  }> = [
    // 1. Primary: Gemini 2.5 Flash with thinking disabled (fast, avoids thinking+JSON 500s)
    { model: "gemini-2.5-flash", jsonMode: true, disableThinking: true },
    // 2. Fallback 1: Gemini 2.0 Flash GA (rock-solid non-thinking multimodal model)
    { model: "gemini-2.0-flash", jsonMode: true, disableThinking: false },
    // 3. Fallback 2: Gemini 2.5 Flash without constrained JSON decoding (avoids PDF JSON-mode 500 INTERNAL)
    { model: "gemini-2.5-flash", jsonMode: false, disableThinking: true },
  ];

  let lastStatus = 500;
  let lastErrorBody = "";

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 450 * i));
    }

    const generationConfig: Record<string, unknown> = {
      temperature: 0.1,
      maxOutputTokens: 8192,
    };
    if (attempt.jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }
    if (attempt.disableThinking) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: userParts }],
      generationConfig,
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      lastStatus = res.status;
      lastErrorBody = await res.text();
      console.warn(
        `[intake-ocr] Attempt ${i + 1} (${attempt.model}, jsonMode=${attempt.jsonMode}) failed with ${res.status}:`,
        lastErrorBody.slice(0, 400)
      );
      // Retry on 5xx, 429, 404 (model availability), or 400 (config mismatch)
      continue;
    }

    const geminiData = await res.json();
    const parts: { text?: string; thought?: boolean }[] =
      geminiData.candidates?.[0]?.content?.parts || [];
    const rawOutput = parts
      .filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
      .trim();

    if (!rawOutput) {
      lastErrorBody = "Empty model output";
      continue;
    }

    try {
      return extractJsonObject(rawOutput);
    } catch (parseErr) {
      console.warn(`[intake-ocr] Attempt ${i + 1} JSON parse failed:`, parseErr);
      lastErrorBody = rawOutput.slice(0, 300);
      continue;
    }
  }

  console.error("[intake-ocr] All Gemini extraction attempts failed:", lastStatus, lastErrorBody);
  if (lastStatus === 429) {
    throw new Error("AI document scanner is temporarily busy (rate limit). Please wait 15 seconds and try again.");
  }
  throw new Error(
    "AI document scanner hit a temporary upstream error reading this file. Please retry, or upload a clear PDF, Word (.docx), or screenshot of the lease summary page."
  );
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  if (!(await checkAiQuota(g.ctx.orgId, { trialing: g.ctx.org.subscription_status === "trialing" }))) {
    return NextResponse.json(
      { error: "Your workspace has reached today's AI usage limit. It resets tomorrow." },
      { status: 429 }
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer;
    let mimeType = "";
    let filename = "upload";
    let userPromptHint = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      userPromptHint = (formData.get("notes") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }

      mimeType = file.type || "";
      filename = file.name || "upload";
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: "File is too large (max 15 MB)." }, { status: 413 });
      }
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await req.json();
      let base64Data = String(body.imageBase64 || "");
      mimeType = String(body.mimeType || "");
      filename = String(body.filename || "upload");
      userPromptHint = String(body.notes || "");

      if (base64Data.includes(";base64,")) {
        base64Data = base64Data.split(";base64,")[1] || "";
      }
      fileBuffer = Buffer.from(base64Data, "base64");
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Empty document or image uploaded." }, { status: 400 });
    }

    let prepared: PreparedInput;
    try {
      prepared = prepareDocumentForGemini(fileBuffer, mimeType, filename);
    } catch (prepErr) {
      const msg = prepErr instanceof Error ? prepErr.message : "Unsupported file format.";
      return NextResponse.json({ error: msg }, { status: 415 });
    }

    const orgName = g.ctx.org.name || "";
    const systemInstruction = `You are an elite real estate document & lease extraction AI for PropOpsIQ property management software.
You are inspecting a document or image uploaded by a landlord or property manager${orgName ? ` (Landlord/Workspace: "${orgName}")` : ""}.
The source material may be:
1. A residential or commercial LEASE AGREEMENT (PDF, Word .docx/.doc, or scanned contract) for a single tenant/household or commercial lessee.
2. A rent roll spreadsheet, tenant schedule, ledger table, or rent receipt book.
3. A photo of a HANDWRITTEN legal pad, notebook page, whiteboard, or sticky note listing tenants, units, and rent amounts.

CRITICAL EXTRACTION RULES:
- Extract every TENANT / LESSEE / RESIDENT / OCCUPANT into the "records" array.
- IMPORTANT FOR LEASE AGREEMENTS: Extract the TENANT / LESSEE (the person or company renting the unit) — NEVER mistake the Landlord / Lessor / Owner / Property Manager${orgName ? ` ("${orgName}")` : ""} for the tenant! If multiple co-tenants are on the same lease for the same unit, put the primary tenant in "name" and list co-tenants or contact details in "contactName" or "notes".
- Convert written-out or annual rent amounts into numeric MONTHLY rent (e.g., "$1,850.00 per month" -> 1850; "$24,000 per annum" -> 2000).
- Convert dates into YYYY-MM-DD format whenever possible (e.g., "November 1, 2026" -> "2026-11-01").
- Extract the property street address or building name into "building", and any apartment/unit/suite/floor identifier into "unit" (if a single-family home has no unit number, use "Main" or "Unit 1").

Output ONLY valid raw JSON matching this exact structure (no markdown backticks, no commentary):
{
  "portfolioSummary": "Brief 1-sentence summary of what was parsed",
  "detectedBuildingName": "Building name or street address if identified, else empty string",
  "records": [
    {
      "name": "Full individual tenant or business lessee name",
      "contactName": "Primary contact or co-tenant if applicable, else empty string",
      "email": "Tenant email address if visible, else empty string",
      "phone": "Tenant phone number if visible, else empty string",
      "building": "Property street address or building name",
      "unit": "Unit, apartment, or suite identifier (e.g. Apt 2B, Suite 200, Main)",
      "monthlyRent": 1500,
      "securityDeposit": 1500,
      "leaseStart": "YYYY-MM-DD",
      "leaseEnd": "YYYY-MM-DD",
      "notes": "Key lease terms, utilities, pets, parking, escalations, or clarifications",
      "confidence": "high",
      "needsReview": false
    }
  ]
}

Context note: ${userPromptHint || "None"}`;

    const parsedResult = await runGeminiWithFallback(apiKey, systemInstruction, prepared);
    const rawRecords = Array.isArray(parsedResult.records) ? parsedResult.records : [];
    const detectedBuildingName = String(parsedResult.detectedBuildingName || "").trim();

    const candidates: ExtractedTenantCandidate[] = rawRecords.map(
      (r: Record<string, unknown>, idx: number) => {
        const name = String(r.name || "").trim();
        const rent = Number(r.monthlyRent) || 0;
        const unit = String(r.unit || "").trim();
        const building = String(r.building || detectedBuildingName || "").trim();

        const isMissingCritical = !name || rent <= 0;
        const needsReview = Boolean(r.needsReview) || isMissingCritical;

        return {
          id: `candidate_${Date.now()}_${idx}`,
          name: name || `Tenant ${idx + 1}`,
          contactName: String(r.contactName || "").trim(),
          email: String(r.email || "").trim(),
          phone: String(r.phone || "").trim(),
          building: building || "Main Building",
          unit: unit || (rawRecords.length === 1 ? "Unit 1" : `Unit ${idx + 1}`),
          monthlyRent: rent,
          securityDeposit: Number(r.securityDeposit) || 0,
          leaseStart: String(r.leaseStart || "").trim(),
          leaseEnd: String(r.leaseEnd || "").trim(),
          notes: String(r.notes || "").trim(),
          confidence:
            (r.confidence as "high" | "medium" | "low") ||
            (isMissingCritical ? "low" : "high"),
          needsReview,
          // If a single lease document was uploaded and we found the tenant name, pre-select it so the user can edit/confirm immediately
          selected: rawRecords.length === 1 ? Boolean(name) : !isMissingCritical,
        };
      }
    );

    return NextResponse.json({
      success: true,
      filename,
      portfolioSummary: String(parsedResult.portfolioSummary || "Extracted tenant records"),
      detectedBuildingName,
      totalExtracted: candidates.length,
      candidates,
    });
  } catch (err) {
    console.error("[intake-ocr] Fatal Error:", err);
    const msg = err instanceof Error ? err.message : "Document analysis failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
