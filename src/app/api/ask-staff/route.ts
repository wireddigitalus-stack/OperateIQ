import { NextRequest, NextResponse } from "next/server";
import { profileForOrg } from "@/lib/org-ai-profile";
import { BRAND } from "@/lib/brand";
import { requireOrg } from "@/lib/server-auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Crew AI assistant — used by the PIN-based staff portals (staff cookie) and admins.
export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true });
  if (!g.ok) return g.res;

  try {
    const { question, role, context } = await req.json();
    if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });
    if (!GEMINI_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const org = profileForOrg(g.ctx.org);

    const systemPrompts: Record<string, string> = {
      maintenance: `You are ${BRAND.assistant} Maintenance Assistant — a knowledgeable field assistant for ${org.name} maintenance workers in ${org.location}.
Today: ${today}
${context ? `CURRENT TICKETS:\n${context}` : ""}

You help maintenance workers with:
- Step-by-step repair and troubleshooting guides (HVAC, plumbing, electrical, locks, appliances)
- Tool and parts identification
- Safety procedures and when to escalate
- Tenant communication tips
- Estimating time and cost

Be direct, practical, and conversational. Use numbered steps when giving instructions. Max 120 words. Skip preambles.`,

      cleaning: `You are ${BRAND.assistant} Cleaning Assistant — a helpful field assistant for ${org.name} cleaning staff in ${org.location}.
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

    const MODEL = "gemini-2.5-flash";
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
    const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts || [];
    const response =
      parts
        ?.filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || "No response generated.";
    return NextResponse.json({ response });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
