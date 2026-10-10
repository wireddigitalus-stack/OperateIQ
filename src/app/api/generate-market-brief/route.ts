import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    const {
      totalLeads, hotLeads, whalLeads, avgBudget, pipeline,
      topSpace, activeTenants, baselineMRR, finalMRR,
      leadsByMonth, spaceBreakdown, period,
    } = await req.json();

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const prompt = `You are a commercial real estate market analyst for Vision LLC, Downtown Bristol's #1 commercial property firm (Bristol, TN/VA — Tri-Cities region, 20+ years).

Write a concise, professional AI Market Brief based on this data snapshot. Be specific, data-driven, and use the actual numbers provided. Sound like a smart analyst, not a chatbot.

DATE: ${today}
REPORTING PERIOD: ${period}

LEAD FUNNEL:
- Total leads captured: ${totalLeads}
- Hot leads (score 70+): ${hotLeads}
- Whale leads (budget $10k+/mo): ${whalLeads}
- Average budget: $${avgBudget.toLocaleString()}/month
- Estimated lead pipeline value: $${pipeline.toLocaleString()}/month

SPACE DEMAND BREAKDOWN:
${spaceBreakdown.map((s: { type: string; count: number; pct: number }) => `  • ${s.type}: ${s.count} leads (${s.pct}%)`).join("\n")}

TOP DEMANDED SPACE: ${topSpace}

TENANT BASE:
- Active tenants: ${activeTenants}
- Current MRR: $${baselineMRR.toLocaleString()}
- Projected 12-month MRR: $${finalMRR.toLocaleString()}

MONTHLY LEAD TREND (last 6 months):
${leadsByMonth.map((m: { label: string; count: number }) => `  ${m.label}: ${m.count} leads`).join("\n")}

Write the brief in 3 short sections:

**Market Pulse** (2–3 sentences): What does the lead data tell us about current demand in Bristol/Tri-Cities?

**Key Opportunities** (2–3 bullet points): What should Vision LLC prioritize based on this data?

**Action Items** (2–3 bullet points): Specific, practical next steps for the team this week.

Keep it under 250 words total. Be direct and smart. No preamble, no "here is your brief".`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: `Gemini API error ${geminiRes.status}` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p.text || "").join("").trim();

    if (!text) {
      return NextResponse.json({ error: "No brief generated. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ brief: text });
  } catch (err) {
    console.error("Market brief generation error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
