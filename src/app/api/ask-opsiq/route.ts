import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { profileForOrg } from "@/lib/org-ai-profile";
import { BRAND } from "@/lib/brand";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

// Lean lead type — only the fields needed for analysis
type LeanLead = {
  name: string;
  spaceType: string;
  budget: number;
  score: number;
  scoreLabel: string;
  timeline: string;
  teamSize: string;
  timestamp: string;
  phone?: string;
  isWhale?: boolean;
  whaleKeywords?: string[];
};

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function buildLeadsContext(leads: LeanLead[]) {
  return leads
    .slice(0, 15)
    .map(
      (l, i) =>
        `${i + 1}. ${l.name} | ${l.spaceType} | $${l.budget}/mo | Score: ${l.score} (${l.scoreLabel}) | Timeline: ${l.timeline} | Team: ${l.teamSize} | ${timeAgo(l.timestamp)}${l.phone ? " | ☎" : ""}${l.isWhale ? ` | ⭐ WHALE ALERT [${(l.whaleKeywords || []).join(", ")}]` : ""}`
    )
    .join("\n");
}

export async function POST(req: NextRequest) {
  // Auth required: protects LLM spend from anonymous abuse.
  const g = await requireOrg(req);
  if (!g.ok) return g.res;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY environment variable is not set" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { question, leads } = body;

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const leadsContext = buildLeadsContext(leads || []);
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const org = profileForOrg(g.ctx.org);

    const prompt = `You are Ask ${BRAND.assistant} — AI lead advisor for ${org.name}'s CRM in ${org.location}.
Today: ${today}
Total leads in pipeline: ${(leads || []).length}

LEAD PIPELINE:
${leadsContext || "No leads in system yet."}

SCORING KEY: Hot Lead = 70+, Warm Lead = 40-69, Nurture = <40

CEO QUESTION: "${question}"

Instructions: Be direct and actionable. Name specific people. Reference budgets and scores. Max 80 words. No filler. No preamble. Complete every sentence.`;

    // Use gemini-2.5-flash on v1beta
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json(
        { error: `Gemini API error ${geminiRes.status}: ${errText}` },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    const parts: { text?: string; thought?: boolean }[] = geminiData.candidates?.[0]?.content?.parts || [];
    const response =
      parts
        ?.filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || "No response generated.";
    return NextResponse.json({ response });

  } catch (error: unknown) {
    console.error("Ask OpsIQ error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
