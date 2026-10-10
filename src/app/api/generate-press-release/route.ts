import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const TYPE_LABELS: Record<string, string> = {
  new_listing:   "New Property Available",
  lease_signed:  "Lease Signed / Deal Closed",
  market_update: "Market Update",
  company_news:  "Company Announcement",
  expansion:     "Business Expansion",
  award:         "Award / Recognition",
  custom:        "Press Release",
};

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    const { type, topic, details } = await req.json();
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    const typeLabel = TYPE_LABELS[type] || "Press Release";
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // Compact prompt — fewer tokens needed from the model
    const prompt = `Write a short professional press release. Be concise — 3 paragraphs max.

Company: Vision LLC (commercial real estate, Bristol, Tennessee/Virginia, Tri-Cities region)
Type: ${typeLabel}
Topic: ${topic}
${details ? `Details: ${details}` : ""}
Today's date: ${today}

Format:
Line 1: HEADLINE: [headline text]
Line 2: (blank)
Line 3: BRISTOL, Tenn./Va. — ${today} — [body paragraph 1]
Line 4: (blank)
[body paragraph 2]
Line 5: (blank)
[body paragraph 3]
Line 6: (blank)
About Vision LLC: Vision LLC is a commercial real estate firm specializing in office, retail, and industrial space in the Tri-Cities region of Tennessee and Virginia. For more information, visit teamvisionllc.com. Contact: ahurley1474@gmail.com

Write it now, no preamble:`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: `Gemini API error ${geminiRes.status}` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();

    // Collect ALL parts in case the model splits the response
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p.text || "").join("").trim();

    if (!text) {
      return NextResponse.json({ error: "No content generated. Please try again." }, { status: 500 });
    }

    // Extract headline if present
    const headlineMatch = text.match(/^HEADLINE:\s*(.+)$/m);
    const title = headlineMatch ? headlineMatch[1].trim() : topic;
    const content = text.replace(/^HEADLINE:\s*.+\n?/m, "").trim();

    return NextResponse.json({ title, content });
  } catch (err) {
    console.error("Press release generation error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
