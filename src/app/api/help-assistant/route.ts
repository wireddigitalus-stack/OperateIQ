import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { BRAND } from "@/lib/brand";
import {
  buildHelpKnowledgeContext,
  TIPS,
  TAB_LABELS,
  TECH_SUPPORT_GUIDES,
  BASIC_FAQS,
  type TabKey,
} from "@/lib/help-data";

const KNOWLEDGE_CONTEXT = buildHelpKnowledgeContext();

const SYSTEM_PROMPT = `You are the ${BRAND.name} AI Help & Tech Support Specialist.
Your job is to answer customer and team questions clearly, accurately, and in plain, easy-to-read language using the official ${BRAND.name} ProTips, Tech Support Guides, and FAQs below.

${KNOWLEDGE_CONTEXT}

RESPONSE RULES:
- Give a direct, reassuring, step-by-step answer in 2 to 5 short sentences or numbered steps.
- Use plain, easy-to-read text (avoid raw markdown symbols like ** or ###).
- Always name the exact tab or button in ${BRAND.name} (for example: "Settings → Team Members", "Import Docs / Excel in the top bar", or "/staff/maintenance").
- If the question is about an account-specific billing or technical issue they cannot resolve in Settings, remind them they can click "Contact Tech Support" right on this page for 1-on-1 help.`;

function findRelatedGuides(query: string): { title: string; categoryLabel: string; categoryKey?: TabKey; supportId?: string }[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  if (!words.length) return [];

  const scored: { score: number; title: string; categoryLabel: string; categoryKey?: TabKey; supportId?: string }[] = [];

  for (const g of TECH_SUPPORT_GUIDES) {
    const hay = `${g.title} ${g.symptom} ${g.solutionSummary} ${g.steps.join(" ")}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (g.title.toLowerCase().includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
    }
    if (score > 0) {
      scored.push({
        score: score + 1,
        title: g.title,
        categoryLabel: `Tech Support · ${g.category}`,
        supportId: g.id,
      });
    }
  }

  (Object.keys(TIPS) as TabKey[]).forEach((k) => {
    for (const t of TIPS[k] || []) {
      const hay = `${t.title} ${t.body} ${(t.highlights || []).join(" ")}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (t.title.toLowerCase().includes(w)) score += 3;
        else if (hay.includes(w)) score += 1;
      }
      if (score > 0) {
        scored.push({
          score,
          title: t.title,
          categoryLabel: TAB_LABELS[k] || "ProTip Guide",
          categoryKey: k,
        });
      }
    }
  });

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const top: typeof scored = [];
  for (const item of scored) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    top.push(item);
    if (top.length >= 3) break;
  }
  return top;
}

function buildLocalFallbackAnswer(query: string, customerCode?: string): string {
  const q = query.toLowerCase();
  if (customerCode && (q.includes("support code") || q.includes("customer code") || q.includes("account id"))) {
    return `Your organization's Customer Support Code (Account ID) is ${customerCode}. You can copy it in one click from the Help Center header, footer, or inside your Admin Dashboard header and Settings tab whenever contacting PropOpsIQ Support.`;
  }
  for (const faq of BASIC_FAQS) {
    if (faq.question.toLowerCase().includes(q) || q.split(/\s+/).filter((w) => w.length > 3 && faq.question.toLowerCase().includes(w)).length >= 2) {
      return faq.answer;
    }
  }
  for (const g of TECH_SUPPORT_GUIDES) {
    if (g.title.toLowerCase().includes(q) || q.split(/\s+/).filter((w) => w.length > 3 && g.title.toLowerCase().includes(w)).length >= 2) {
      return `${g.solutionSummary}\n\nSteps:\n${g.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    }
  }
  const matches = findRelatedGuides(query);
  if (matches.length > 0 && matches[0].categoryKey) {
    const tip = (TIPS[matches[0].categoryKey] || []).find((t) => t.title === matches[0].title);
    if (tip) {
      return `${tip.title}: ${tip.body}${tip.highlights?.length ? `\n\nKey Tips:\n• ${tip.highlights.join("\n• ")}` : ""}`;
    }
  }
  return `You can search all ${BRAND.name} ProTips and Tech Support guides right below, or use the "Import Docs / Excel" and "Ask OpsIQ" tools in your dashboard top bar.${customerCode ? ` Your Customer Support Code is ${customerCode}.` : ""} Need 1-on-1 assistance? Click "Contact Tech Support" at the bottom of this page.`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`help-assistant:${ip}`, 25, 60_000)) {
    return NextResponse.json(
      { error: "Please wait a moment before asking another question." },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as { question?: string; customerCode?: string };
    const question = String(body.question || "").trim().slice(0, 600);
    const customerCode = typeof body.customerCode === "string" && body.customerCode.trim() ? body.customerCode.trim() : undefined;
    if (!question) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }

    const relatedGuides = findRelatedGuides(question);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        answer: buildLocalFallbackAnswer(question, customerCode),
        relatedGuides,
      });
    }

    const systemInstructionText = customerCode
      ? `${SYSTEM_PROMPT}\n\nACTIVE CUSTOMER CONTEXT:\n- Customer Support Code (Account ID): ${customerCode}\n- If the user asks for their customer support code or account ID, or asks how to contact support, provide their exact Customer Support Code (${customerCode}).`
      : SYSTEM_PROMPT;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          contents: [{ role: "user", parts: [{ text: question }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      return NextResponse.json({
        answer: buildLocalFallbackAnswer(question, customerCode),
        relatedGuides,
      });
    }

    const geminiData = await geminiRes.json();
    const parts: { text?: string; thought?: boolean }[] =
      geminiData.candidates?.[0]?.content?.parts || [];
    const answer =
      parts
        .filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("")
        .trim() || buildLocalFallbackAnswer(question, customerCode);

    return NextResponse.json({
      answer,
      relatedGuides,
    });
  } catch (err) {
    console.error("[help-assistant] error:", err);
    return NextResponse.json({
      answer:
        "I encountered a temporary connection issue, but you can browse all step-by-step guides and troubleshooting steps right below.",
      relatedGuides: [],
    });
  }
}
