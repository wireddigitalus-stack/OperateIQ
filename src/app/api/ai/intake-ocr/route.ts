import { NextRequest, NextResponse } from "next/server";
import { checkAiQuota } from "@/lib/rateLimit";
import { requireOrg } from "@/lib/server-auth";
import {
  normalizeExtractedCandidate,
  prepareDocumentForGemini,
  redactSensitivePii,
  type ExtractedTenantCandidate,
  type PreparedInput,
} from "@/lib/lease-extraction";

export type { ExtractedTenantCandidate };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();
const BUCKET = "tenant-assets";
const ATTACHABLE_EXTS = new Set(["pdf", "doc", "docx", "rtf", "txt", "png", "jpg", "jpeg", "webp"]);

const encodeStoragePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function downloadFromSupabaseStorage(storagePath: string): Promise<Buffer> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeStoragePath(storagePath)}`,
    {
      method: "GET",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Could not retrieve staged file from storage (${res.status}): ${errText.slice(0, 120)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Best-effort persistence of multipart/base64 uploaded lease files into Supabase Storage
 * so the source document is automatically attached to the tenant card on commit.
 */
async function persistSourceDocIfPossible(
  orgId: string,
  filename: string,
  mimeType: string,
  buf: Buffer
): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_KEY || buf.length === 0 || buf.length > 25 * 1024 * 1024) {
    return "";
  }
  const lastDot = filename.lastIndexOf(".");
  const baseName = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
  const ext = (lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : "").replace(/[^a-z0-9]/g, "");
  if (!ATTACHABLE_EXTS.has(ext)) return "";

  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60).toLowerCase() || "lease";
  const storagePath = `${orgId}/intake-staging/${Date.now()}-${cleanBase}.${ext}`;
  const contentType =
    mimeType ||
    (ext === "pdf"
      ? "application/pdf"
      : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream");

  try {
    const upRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeStoragePath(storagePath)}`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(buf),
      }
    );
    if (upRes.ok) {
      return `/api/tenant-upload?path=${encodeURIComponent(storagePath)}`;
    }
  } catch (err) {
    console.warn("[intake-ocr] Non-fatal source doc persistence warning:", err);
  }
  return "";
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
    { model: "gemini-2.5-flash", jsonMode: true, disableThinking: true },
    { model: "gemini-2.0-flash", jsonMode: true, disableThinking: false },
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
  const { orgId } = g.ctx;

  if (!(await checkAiQuota(orgId, { trialing: g.ctx.org.subscription_status === "trialing" }))) {
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
    let sourceDocUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      userPromptHint = (formData.get("notes") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }

      mimeType = file.type || "";
      filename = file.name || "upload";
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "File is too large (max 25 MB)." }, { status: 413 });
      }
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      sourceDocUrl = await persistSourceDocIfPossible(orgId, filename, mimeType, fileBuffer);
    } else {
      const body = await req.json();
      mimeType = String(body.mimeType || "");
      filename = String(body.filename || "upload");
      userPromptHint = String(body.notes || "");

      const storagePath = String(body.storagePath || "").trim().replace(/^\/+/, "");
      if (storagePath) {
        if (!storagePath.startsWith(`${orgId}/`) || storagePath.includes("..")) {
          return NextResponse.json({ error: "Forbidden storage path." }, { status: 403 });
        }
        fileBuffer = await downloadFromSupabaseStorage(storagePath);
        sourceDocUrl = `/api/tenant-upload?path=${encodeURIComponent(storagePath)}`;
      } else {
        let base64Data = String(body.imageBase64 || "");
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,")[1] || "";
        }
        fileBuffer = Buffer.from(base64Data, "base64");
        sourceDocUrl = await persistSourceDocIfPossible(orgId, filename, mimeType, fileBuffer);
      }
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
The source material may contain:
1. ONE OR MULTIPLE residential or commercial LEASE AGREEMENTS (e.g., Commercial NNN lease, Multi-Family Apartment lease, Single-Family Residence SFR lease, or a multi-lease packet).
2. A rent roll spreadsheet, tenant schedule, ledger table, or rent receipt book.
3. A photo of a HANDWRITTEN legal pad, notebook page, whiteboard, or sticky note listing tenants, units, and rent amounts.

CRITICAL EXTRACTION RULES:
- Extract EVERY distinct TENANT / LESSEE / RESIDENT agreement in the document as its own object in "records". If a single file contains 3 separate leases across 3 properties, output 3 objects in "records" — each with its own exact building, unit, rent, fees, and dates!
- NEVER mistake the Landlord / Lessor / Owner / Property Management LLC${orgName ? ` ("${orgName}")` : ""} for the tenant! Put the primary Tenant / Lessee (person or business renting the space) in "name".
- If there are Co-Tenants (e.g., "Marcus Vance, Sarah Vance"), put the primary tenant ("Marcus Vance") in "name" and co-tenants ("Sarah Vance") in "contactName". Put any personal/corporate Guarantor in "guarantor".
- SEPARATE BASE RENT FROM ADD-ON MONTHLY FEES:
  * "monthlyRent": Base monthly rent ONLY (do NOT add NNN, pet rent, or landscaping fees into monthlyRent!). E.g. if base rent is $2,400/mo plus $50/mo landscaping fee ($2,450 total), set "monthlyRent": 2400, "utilitiesFee": 50, "utilitiesFeeLabel": "Landscaping Fee".
  * "nnnFee": Monthly NNN / CAM / Taxes+Insurance+CAM estimate on commercial leases (e.g. $450/mo -> 450). Put combined NNN/CAM estimate in "nnnFee" and leave "camFee": 0 so it is never double-counted.
  * "utilitiesFee": Recurring monthly residential/commercial add-ons such as Pet Rent (e.g. +$35/mo), Landscaping/Lawn fee (+$50/mo), RUBS/utility flat fee, or parking fee. Describe what it is in "utilitiesFeeLabel" (e.g. "Pet Rent", "Landscaping Fee").
  * "securityDeposit": Refundable security deposit / escrow amount ONLY. Put any non-refundable pet/move-in fee in "nonRefundableDeposit" (e.g. $250 non-refundable pet deposit -> 250).
  * "secDepReceived": true if the lease states the security deposit is deposited upon signing or held in escrow; false otherwise.
- ESCALATIONS, LATE FEES & PREVENTATIVE MAINTENANCE:
  * "escalationPct": Annual rent escalation percentage if specified (e.g. "annual 3% escalation" -> 3, else 0).
  * "escalationDate": First escalation anniversary date in YYYY-MM-DD if determinable (e.g. leaseStart 2025-01-01 -> "2026-01-01"), else "".
  * "lateFeeRule": Concise late fee summary if stated (e.g. "$82.50 (5%) after 5th day"), else "".
  * "hvacFilterIntervalDays": Integer days if lease specifies an HVAC air filter replacement schedule (e.g. "HVAC air filters changed every 60 days" -> 60), else 0.
- PROPERTY & UNIT CLASSIFICATION:
  * "building": Clean building/community name (e.g. "Apex Plaza", "Oakview Apartments") OR street address for a Single-Family Residence (e.g. "742 Evergreen Terrace"). Do NOT append the unit number or city onto "building" when they belong in "unit" and "propertyCity"!
  * "propertyAddress": Street address if stated (e.g. "742 Evergreen Terrace"), else "".
  * "propertyCity": City (and state if shown, e.g. "Metropolis", "Springfield"), else "".
  * "propertyType": One of "Commercial", "Multi-Family", "Single-Family", or "Mixed-Use".
  * "unit": Suite, apartment, or unit number (e.g. "Suite 100", "Unit 2B", or "Main" for a Single-Family Residence).
  * "unitSqft": Rentable square footage (RSF / SqFt) as an integer if stated (e.g. 2400), else 0.
- PRIVACY: Never output a full 9-digit Social Security Number; always mask as "***-**-8812" if present. (Business EINs like "12-3456789" may be noted in "notes").
- Dates must be YYYY-MM-DD (e.g. "2025-01-01").

Output ONLY valid raw JSON matching this exact structure:
{
  "portfolioSummary": "Brief 1-sentence summary of what was parsed",
  "detectedBuildingName": "Building name ONLY if all records belong to a single building, else empty string",
  "records": [
    {
      "name": "Summit Tech LLC",
      "contactName": "",
      "guarantor": "Jane Doe",
      "email": "",
      "phone": "",
      "building": "Apex Plaza",
      "propertyAddress": "",
      "propertyCity": "Metropolis",
      "propertyType": "Commercial",
      "unit": "Suite 100",
      "unitSqft": 2400,
      "beds": 0,
      "baths": 0,
      "monthlyRent": 5200,
      "nnnFee": 450,
      "camFee": 0,
      "utilitiesFee": 0,
      "utilitiesFeeLabel": "",
      "cleaningFee": 0,
      "securityDeposit": 10400,
      "nonRefundableDeposit": 0,
      "secDepReceived": true,
      "secDepNotes": "Held in interest-bearing escrow",
      "escalationPct": 3,
      "escalationDate": "2026-01-01",
      "lateFeeRule": "",
      "hvacFilterIntervalDays": 0,
      "leaseStart": "2025-01-01",
      "leaseEnd": "2029-12-31",
      "notes": "Commercial office / software dev · EIN 12-3456789 · 14.2% NNN share",
      "confidence": "high",
      "needsReview": false
    }
  ]
}

Context note: ${redactSensitivePii(userPromptHint) || "None"}`;

    const parsedResult = await runGeminiWithFallback(apiKey, systemInstruction, prepared);
    const rawRecords = Array.isArray(parsedResult.records) ? parsedResult.records : [];
    const detectedBuildingName = String(parsedResult.detectedBuildingName || "").trim();

    const candidates: ExtractedTenantCandidate[] = rawRecords.map(
      (r: Record<string, unknown>, idx: number) =>
        normalizeExtractedCandidate(r, idx, {
          totalRecords: rawRecords.length,
          detectedBuildingName,
          sourceDocUrl,
          sourceDocName: filename,
        })
    );

    return NextResponse.json({
      success: true,
      filename,
      sourceDocUrl,
      portfolioSummary: redactSensitivePii(String(parsedResult.portfolioSummary || "Extracted tenant records")),
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
