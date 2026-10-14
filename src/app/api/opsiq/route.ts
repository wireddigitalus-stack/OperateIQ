import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { BRAND } from "@/lib/brand";
import { PLANS, FEATURE_LABELS, TRIAL_DAYS } from "@/lib/plans";

// OpsIQ — public product & trial-conversion assistant for the OperateIQ marketing site.

const planSummary = PLANS.map(
  (p) =>
    `- ${p.name} ($${p.monthly}/mo or $${p.annual}/yr — 2 months free on annual): ${
      p.limits.properties ? `up to ${p.limits.properties} properties` : "unlimited properties"
    }, ${p.limits.users ? `up to ${p.limits.users} team members` : "unlimited team members"}. Tagline: "${
      p.tagline || p.blurb
    }". Includes: ${p.features.map((f) => FEATURE_LABELS[f]).join(", ")}.`
).join("\n");

const SYSTEM_PROMPT = `You are ${BRAND.assistant}, the smart AI product & portfolio advisor for ${BRAND.name} (${BRAND.url}).
${BRAND.description}

PLANS (every plan starts with a ${TRIAL_DAYS}-day free trial — instant workspace setup in 60 seconds, and includes a 1-click sample demo property loader so owners can test everything immediately):
${planSummary}

KEY PLATFORM HIGHLIGHTS:
- AI Leasing & CRM: Instant AI lead scoring (Hot/Warm/Prospect + Whale alerts), call logs, pipeline tracking, and automated email alerts.
- Tenants & Rent Ledger: Track every tenant, lease expiration, move-in checklist, and monthly rent collection status in one place.
- Mobile Crew Portals (6-Digit PIN): Maintenance techs (/staff/maintenance) and cleaning crews (/staff/cleaning) log in with a 6-digit PIN from their phone to view work orders, upload completion photos, log HVAC filter changes, and record building inspections — without seeing admin financials.
- Executive Reporting & AI: Weekly QBRs, portfolio snapshots, market intelligence, and a private in-dashboard Ask OpsIQ advisor.
- Pro Website & CMS (Pro Tier): Full custom-domain property showcase website + Site Builder CMS + AI Blog & Social Studio.
- Enterprise Multi-Tenant Security: Every customer workspace is 100% isolated by organization ID (org_id) with strict database Row-Level Security (RLS). Zero cross-pollination between accounts.

CONVERSATION & CONVERSION RULES:
- Only discuss ${BRAND.name}: features, plans, pricing, onboarding, security, and how it helps commercial & residential property owners/managers.
- Keep answers smart, warm, specific, and concise (2–4 short sentences). Use plain text (no markdown headers or raw asterisks).
- Whenever helpful, recommend the best-fit tier (Starter $99/mo for 1–5 properties, Growth $249/mo for growing teams up to 15 properties needing Cleaning/Inspections/Reports, or Pro $499/mo for unlimited properties + custom public website & AI Marketing Studio).
- Always close your reply with a natural, inviting nudge to start the ${TRIAL_DAYS}-day free trial using the button below (or at /signup) so they can explore a live workspace hands-on.
- Never invent features, integrations, or discounts not listed above.`;

function detectRecommendedPlan(userText: string, replyText: string): "starter" | "growth" | "pro" {
  const combined = `${userText} ${replyText}`.toLowerCase();
  if (
    combined.includes("pro plan") ||
    combined.includes("$499") ||
    combined.includes("website") ||
    combined.includes("custom domain") ||
    combined.includes("unlimited") ||
    combined.includes("blog") ||
    combined.includes("social studio")
  ) {
    return "pro";
  }
  if (
    combined.includes("starter") ||
    combined.includes("$99") ||
    combined.includes("1-5") ||
    combined.includes("small portfolio") ||
    combined.includes("up to 5")
  ) {
    return "starter";
  }
  return "growth";
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`opsiq:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { reply: "You're sending messages quickly — please wait a moment or start your 14-day free trial right below!" },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: `Every ${BRAND.name} plan includes a ${TRIAL_DAYS}-day free trial! Choose Starter ($99/mo), Growth ($249/mo), or Pro ($499/mo) to launch your workspace in 60 seconds.`,
      recommendedPlan: "growth",
      trialDays: TRIAL_DAYS,
    });
  }

  try {
    const { messages } = (await req.json()) as { messages?: { role: "user" | "assistant"; content: string }[] };
    const history = (messages || []).slice(-12).filter((m) => m?.content);
    if (!history.length || history[history.length - 1].role !== "user") {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const lastUserMessage = String(history[history.length - 1].content || "");
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 2000) }],
    }));
    while (contents.length && contents[0].role !== "user") contents.shift();

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 450,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      throw new Error(`Gemini status ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const parts: { text?: string; thought?: boolean }[] = geminiData.candidates?.[0]?.content?.parts || [];
    const reply =
      parts
        .filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("")
        .trim() ||
      `You can test every ${BRAND.name} workflow hands-on with our ${TRIAL_DAYS}-day free trial!`;

    const recommendedPlan = detectRecommendedPlan(lastUserMessage, reply);

    return NextResponse.json({
      reply,
      recommendedPlan,
      trialDays: TRIAL_DAYS,
    });
  } catch (err) {
    console.error("[opsiq] error:", err);
    return NextResponse.json({
      reply: `I hit a quick snag, but you can launch a ${TRIAL_DAYS}-day free trial right below or compare plans on /pricing!`,
      recommendedPlan: "growth",
      trialDays: TRIAL_DAYS,
    });
  }
}
