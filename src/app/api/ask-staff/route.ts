import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { question, role, context } = await req.json();
    if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });
    if (!GEMINI_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const systemPrompts: Record<string, string> = {
      maintenance: `You are VISION Maintenance AI — a knowledgeable field assistant for Hurley Enterprise maintenance workers in Bristol, TN/VA.
Today: ${today}
${context ? `CURRENT TICKETS:\n${context}` : ""}

You help maintenance workers with:
- Step-by-step repair and troubleshooting guides (HVAC, plumbing, electrical, locks, appliances)
- Tool and parts identification
- Safety procedures and when to escalate
- Tenant communication tips
- Estimating time and cost

Be direct, practical, and conversational. Use numbered steps when giving instructions. Max 120 words. Skip preambles.`,

      cleaning: `You are VISION Cleaning AI — a helpful field assistant for Hurley Enterprise cleaning staff in Bristol, TN/VA.
Today: ${today}
${context ? `TODAY'S SCHEDULE:\n${context}` : ""}

You help cleaning staff with:
- Cleaning procedures and best practices
- Chemical safety and dilution ratios
- What issues to report and how to document them
- Efficient room-by-room workflows
- Supply requests and restocking

Be friendly, clear, and practical. Use bullet points when listing steps. Max 120 words. Skip preambles.`,
    };

    const systemText = systemPrompts[role] || systemPrompts.maintenance;
    const prompt = `${systemText}\n\nSTAFF QUESTION: "${question}"`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return NextResponse.json({ error: `AI error: ${err}` }, { status: 500 });
    }

    const data = await geminiRes.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No response generated.";
    return NextResponse.json({ response });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
