import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let base64Data = "";
    let mimeType = "image/jpeg";
    let filename = "upload";
    let userPromptHint = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      userPromptHint = (formData.get("notes") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }

      mimeType = file.type || "image/jpeg";
      filename = file.name || "upload";
      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
    } else {
      const body = await req.json();
      base64Data = body.imageBase64 || "";
      mimeType = body.mimeType || "image/jpeg";
      filename = body.filename || "upload";
      userPromptHint = body.notes || "";

      // Strip data:image/...;base64, prefix if included
      if (base64Data.includes(";base64,")) {
        const parts = base64Data.split(";base64,");
        base64Data = parts[1];
      }
    }

    if (!base64Data) {
      return NextResponse.json({ error: "Empty image or file payload." }, { status: 400 });
    }

    const systemInstruction = `You are an elite real estate intelligence extraction AI for OperateIQ property management software.
You are inspecting an image or scanned document uploaded by a property owner or asset manager.
The source material may be:
1. A photo of a printed commercial or residential lease agreement / contract summary.
2. A photo or screenshot of a rent roll spreadsheet, ledger table, or rent receipt book.
3. A photo of a HANDWRITTEN legal pad, notebook page, whiteboard, or sticky note listing tenants, units, and rent amounts.

YOUR TASK:
Extract every tenant, occupant, or lease record visible into a structured JSON array.
Handle messy handwriting, shorthand abbreviations (e.g. "ste", "apt", "dep", "mo", "pd"), and diverse formatting.

Output ONLY valid, raw JSON (no markdown formatting, no code blocks, no preamble, no backticks):
{
  "portfolioSummary": "Brief 1-sentence summary of what was parsed",
  "detectedBuildingName": "Building or property name/address if identified, else empty string",
  "records": [
    {
      "name": "Full business or individual tenant name",
      "contactName": "Primary contact person if separate from tenant name, else empty",
      "email": "Email address if visible, else empty",
      "phone": "Phone number if visible, else empty",
      "building": "Building name or property location",
      "unit": "Unit, suite, or space identifier (e.g. Unit 104, Suite 2B)",
      "monthlyRent": 1500, // Monthly base rent as an integer or float. If annual, divide by 12. If zero or unknown, 0.
      "securityDeposit": 0, // Security deposit held as a number, else 0.
      "leaseStart": "YYYY-MM-DD", // Start date if visible or inferable, else empty string.
      "leaseEnd": "YYYY-MM-DD", // Expiration date if visible or inferable, else empty string.
      "notes": "Any other details, payment status, terms, or handwriting clarifications",
      "confidence": "high", // "high" | "medium" | "low"
      "needsReview": false // true if handwriting was ambiguous, rent was inferred, or key data was missing
    }
  ]
}

User context note: ${userPromptHint || "None provided"}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[intake-ocr] Gemini API Error:", geminiRes.status, errText);
      return NextResponse.json(
        { error: `AI OCR processing failed: ${errText}` },
        { status: geminiRes.status }
      );
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawOutput);
    } catch {
      // Fallback: strip any stray markdown backticks
      const cleanJson = rawOutput.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
      parsedResult = JSON.parse(cleanJson);
    }

    const rawRecords = Array.isArray(parsedResult.records) ? parsedResult.records : [];
    
    // Normalize and add unique IDs + selection flags for staging UI
    const candidates: ExtractedTenantCandidate[] = rawRecords.map((r: Record<string, unknown>, idx: number) => {
      const name = String(r.name || "").trim();
      const rent = Number(r.monthlyRent) || 0;
      const unit = String(r.unit || "").trim();
      const building = String(r.building || parsedResult.detectedBuildingName || "").trim();

      const isMissingCritical = !name || rent <= 0;
      const needsReview = Boolean(r.needsReview) || isMissingCritical;

      return {
        id: `candidate_${Date.now()}_${idx}`,
        name: name || `Tenant ${idx + 1}`,
        contactName: String(r.contactName || "").trim(),
        email: String(r.email || "").trim(),
        phone: String(r.phone || "").trim(),
        building: building || "Main Building",
        unit: unit || `Unit ${idx + 1}`,
        monthlyRent: rent,
        securityDeposit: Number(r.securityDeposit) || 0,
        leaseStart: String(r.leaseStart || "").trim(),
        leaseEnd: String(r.leaseEnd || "").trim(),
        notes: String(r.notes || "").trim(),
        confidence: (r.confidence as "high" | "medium" | "low") || (isMissingCritical ? "low" : "high"),
        needsReview,
        selected: !isMissingCritical,
      };
    });

    return NextResponse.json({
      success: true,
      filename,
      portfolioSummary: parsedResult.portfolioSummary || "Extracted tenant list",
      detectedBuildingName: parsedResult.detectedBuildingName || "",
      totalExtracted: candidates.length,
      candidates,
    });
  } catch (err) {
    console.error("[intake-ocr] Fatal Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Intake OCR failed: ${msg}` }, { status: 500 });
  }
}
