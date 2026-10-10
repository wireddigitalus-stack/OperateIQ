import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "@/lib/rateLimit";
import { BRAND } from "@/lib/brand";
import { PLANS, FEATURE_LABELS, TRIAL_DAYS } from "@/lib/plans";

// OpsIQ — public product assistant for the OperateIQ marketing site.
// Answers questions about features, plans and onboarding. No lead capture,
// no email, no database writes.

const planSummary = PLANS.map(
  (p) =>
    `- ${p.name}: $${p.monthly}/mo or $${p.annual}/yr; ${
      p.limits.properties ? `up to ${p.limits.properties} properties` : "unlimited properties"
    }, ${p.limits.users ? `${p.limits.users} users` : "unlimited users"}. Includes: ${p.features
      .map((f) => FEATURE_LABELS[f])
      .join(", ")}.`
).join("\n");

const SYSTEM_PROMPT = `You are ${BRAND.assistant}, the friendly AI assistant for ${BRAND.name}.
${BRAND.description}

PLANS (every plan has a ${TRIAL_DAYS}-day free trial, no credit card required):
${planSummary}

RULES:
- Only discuss ${BRAND.name}: features, plans, pricing, onboarding, security and how it helps property owners.
- Be concise (2–4 short sentences), warm and practical. Use plain text, no markdown headings.
- Recommend a plan when asked, based on portfolio size and needs.
- Data is isolated per customer account with database row-level security.
- If you don't know something, say so and suggest the contact page (/contact).
- Never invent features, integrations, discounts or customer names.
- Signup is at /signup and plans are at /pricing.`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`opsiq:${ip}`, 20, 60_000)) {
    return NextResponse.json({ reply: "You're sending messages quickly — please wait a moment and try again." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: `${BRAND.assistant} is offline right now. Please check out /pricing or reach us via /contact.` });
  }

  try {
    const { messages } = (await req.json()) as { messages?: { role: "user" | "assistant"; content: string }[] };
    const history = (messages || []).slice(-12).filter((m) => m?.content);
    if (!history.length || history[history.length - 1].role !== "user") {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 2000) }],
    }));
    // Gemini requires the conversation to start with a user turn.
    while (contents.length && contents[0].role !== "user") contents.shift();

    const result = await model.generateContent({ contents });
    return NextResponse.json({ reply: result.response.text().trim() });
  } catch (err) {
    console.error("[opsiq] error:", err);
    return NextResponse.json({ reply: "Sorry — I hit a snag. Please try again in a moment." });
  }
}
