import { NextRequest, NextResponse } from "next/server";
import { LEADS_STORE, type Lead } from "@/lib/leads-store";
import { detectWhale } from "@/lib/whale-detector";
import { supabaseAdmin, rowToLead } from "@/lib/supabase";
import { writeActivityLog } from "@/lib/activity-log";
import { PROPERTIES } from "@/lib/data";
import { getOrgProfile } from "@/lib/org-profile";
import { BRAND } from "@/lib/brand";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY environment variable is not set");

// ── Email notification config ─────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const LEAD_NOTIFY_TO = (process.env.LEAD_NOTIFY_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const FROM_EMAIL = process.env.RESEND_FROM || "OperateIQ <noreply@example.com>";

function buildLeadEmailHtml(lead: Lead): string {
  const scoreColor = lead.score >= 70 ? "#16A34A" : lead.score >= 40 ? "#D97706" : "#4B5563";
  const scoreBgColor = lead.score >= 70 ? "#DCFCE7" : lead.score >= 40 ? "#FEF3C7" : "#F3F4F6";
  const scoreEmoji = lead.score >= 70 ? "🔥" : lead.score >= 40 ? "📋" : "📎";
  const row = (label: string, value: string | number | undefined) =>
    value
      ? `<tr>
           <td style="padding:8px 12px 8px 0;color:#4B5563;font-size:11px;font-weight:700;text-transform:uppercase;white-space:nowrap;vertical-align:top;width:120px;">${label}</td>
           <td style="padding:8px 0;color:#111827;font-weight:600;font-size:14px;">${value}</td>
         </tr>`
      : "";

  const whaleSection = lead.isWhale
    ? `<div style="margin:16px 0;padding:12px 16px;background-color:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;">
         <p style="margin:0;font-size:13px;font-weight:800;color:#B45309;">🐋 WHALE ALERT — ${lead.whaleTier?.toUpperCase()}</p>
         <p style="margin:4px 0 0;font-size:12px;color:#451A03;">Keywords: ${(lead.whaleKeywords || []).join(", ")}</p>
       </div>`
    : "";

  const propertiesSection = (lead.matchedProperties || []).length > 0
    ? `<div style="margin-top:16px;">
         <p style="margin:0 0 8px;color:#4B5563;font-size:11px;font-weight:700;text-transform:uppercase;">Matched Properties</p>
         ${(lead.matchedProperties || []).map((p: { name?: string; type?: string; sqft?: string; matchReason?: string }) =>
           `<div style="padding:10px 14px;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:6px;">
              <p style="margin:0;color:#111827;font-weight:700;font-size:13px;">${p.name || "Property"}</p>
              <p style="margin:2px 0 0;color:#4B5563;font-size:11px;">${p.type || ""} · ${p.sqft || ""}</p>
              <p style="margin:4px 0 0;color:#1F2937;font-size:12px;line-height:1.4;">${p.matchReason || ""}</p>
            </div>`
         ).join("")}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px;">
    <div style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:10px;height:10px;border-radius:50%;background-color:${scoreColor};flex-shrink:0;"></div>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#111827;">${scoreEmoji} New Lead: ${lead.name}</h1>
      </div>
      <div style="display:inline-block;padding:4px 12px;background-color:${scoreBgColor};border:1px solid ${scoreColor}40;border-radius:20px;margin-bottom:20px;">
        <span style="font-size:13px;font-weight:800;color:${scoreColor};">${lead.scoreLabel} · Score: ${lead.score}/100</span>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${row("Name", lead.name)}
        ${row("Email", lead.email)}
        ${row("Phone", lead.phone)}
        ${row("Space Type", lead.spaceType)}
        ${row("Budget", lead.budget ? `$${lead.budget.toLocaleString()}/mo` : undefined)}
        ${row("Timeline", lead.timeline)}
        ${row("Team Size", lead.teamSize)}
        ${row("Source", lead.source)}
        ${row("Medium", lead.medium)}
        ${row("Campaign", lead.campaign)}
      </table>

      ${lead.reasoning ? `
      <div style="margin-top:16px;padding:12px 16px;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
        <p style="margin:0 0 4px;color:#4B5563;font-size:11px;font-weight:700;text-transform:uppercase;">AI Analysis</p>
        <p style="margin:0;color:#1F2937;font-size:13px;line-height:1.5;">${lead.reasoning}</p>
      </div>` : ""}

      ${whaleSection}
      ${propertiesSection}

      ${lead.additionalInfo ? `
      <div style="margin-top:16px;padding:12px 16px;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
        <p style="margin:0 0 4px;color:#4B5563;font-size:11px;font-weight:700;text-transform:uppercase;">Additional Info</p>
        <p style="margin:0;color:#1F2937;font-size:13px;line-height:1.5;">${lead.additionalInfo}</p>
      </div>` : ""}

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;">
        ${lead.email ? `<p style="margin:0;color:#4B5563;font-size:12px;">Reply to reach <strong style="color:#111827;">${lead.name}</strong> at <a href="mailto:${lead.email}" style="color:#16A34A;font-weight:600;text-decoration:none;">${lead.email}</a></p>` : ""}
        <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">Submitted via ${BRAND.name} Lease Bot · <a href="${BRAND.url}/admin" style="color:#16A34A;font-weight:600;text-decoration:none;">Open Dashboard →</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}


const buildPropertiesContext = (orgName: string) => `
Available ${orgName} Properties (use EXACT id values shown):
${PROPERTIES.map(
  (p, i) => `${i + 1}. id="${p.id}" — ${p.name} — ${p.type} — ${p.sqft} sqft — ${p.city}`
).join("\n")}
`;

const SCORING_PROMPT = (lead: Partial<Lead>) => {
  const org = getOrgProfile();
  return `
You are a commercial real estate lead scoring AI for ${org.name} in ${org.location}.

Score this lead from 25-100 (minimum score is always 25). Use these criteria:
- Base score: 25 (every lead starts here)
- Budget > $2,000/mo = strong signal (+20 pts)
- Budget $1,000–$2,000/mo = moderate signal (+12 pts)
- Budget < $1,000/mo = weak signal (+5 pts)
- Move-in timeline < 30 days = very hot (+25 pts)
- Move-in timeline 30–60 days = warm (+15 pts)
- Move-in timeline 60–90 days = cool (+8 pts)
- Move-in timeline > 90 days = cold (+3 pts)
- Space type = Office or Executive Suite = high fit (+15 pts)
- Space type = CoWork = good fit (+10 pts)
- Space type = Retail or Warehouse = moderate fit (+8 pts)
- Team size 5+ = strong need (+10 pts)
- Team size 2–4 = moderate need (+7 pts)
- Solo = solo (+3 pts)

The final score MUST be between 25 and 100 inclusive. Never return a score below 25.

LEAD DATA:
- Name: ${lead.name}
- Space Type Requested: ${lead.spaceType}
- Monthly Budget: $${lead.budget}
- Move-in Timeline: ${lead.timeline}
- Team Size: ${lead.teamSize}
- Additional Info: ${lead.additionalInfo || "None provided"}

${buildPropertiesContext(org.name)}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "score": <number 25-100>,
  "scoreLabel": "<Verified Lead|MQL|Prospect Lead>",
  "reasoning": "<2-sentence max explanation of score>",
  "matchedProperties": [
    {
      "id": "<use EXACT id from property list above>",
      "name": "<property name>",
      "type": "<Office|CoWork|Retail|Warehouse|Event>",
      "sqft": "<size range>",
      "location": "${org.location}",
      "matchReason": "<one sentence why this property fits>"
    }
  ]
}

Rules for scoreLabel:
- score >= 75 = "Verified Lead"
- score 50–74 = "MQL"
- score < 50 = "Prospect Lead"

Include 1-2 best matching properties only.
`;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, spaceType, budget, timeline, teamSize, additionalInfo,
      utm_source, utm_medium, utm_campaign, sessionId,
      actorName, actorEmail, followUpDate, createdByEmployee } = body;

    if (!name || !spaceType || !budget) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const budgetNum = Number(budget);

    const leadData: Partial<Lead> = {
      name, email, phone,
      spaceType, budget: budgetNum,
      timeline, teamSize, additionalInfo,
    };

    // v1beta for gemini-2.5-flash — v1 returns 400 for this key on some configurations
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SCORING_PROMPT(leadData) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
          // NOTE: no thinkingConfig — not supported by this API key
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: `Gemini ${geminiRes.status}: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    // Filter out thought:true parts — gemini-2.5-flash returns thinking tokens
    // in separate parts alongside the real response. We only want the actual text.
    const parts: Array<{ text?: string; thought?: boolean }> =
      geminiData.candidates?.[0]?.content?.parts || [];
    const rawText = parts
      .filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
      .trim();

    // Robust JSON extraction — find the first {...} block even if thinking text is present
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Gemini response:", rawText.slice(0, 500));
      return NextResponse.json({ error: "AI response was not valid JSON" }, { status: 500 });
    }
    const aiResult = JSON.parse(jsonMatch[0]);

    // Run whale detection on the free-text additionalInfo
    const whale = detectWhale(additionalInfo || "");

    const lead: Lead = {
      id: `lead_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name,
      email: email || "",
      phone: phone || "",
      spaceType,
      budget: budgetNum,
      timeline,
      teamSize,
      additionalInfo: additionalInfo || "",
      score: aiResult.score,
      scoreLabel: aiResult.scoreLabel,
      reasoning: aiResult.reasoning,
      matchedProperties: aiResult.matchedProperties || [],
      // Whale Alert
      isWhale: whale.isWhale,
      whaleTier: whale.whaleTier,
      whaleKeywords: whale.whaleKeywords,
      // UTM attribution
      source: utm_source || "organic",
      medium: utm_medium || "direct",
      campaign: utm_campaign || "",
      followUpDate: followUpDate || null,
      createdByEmployee: createdByEmployee || actorName || "Staff",
      progress: "0-25%",
    };

    LEADS_STORE.unshift(lead);
    if (LEADS_STORE.length > 50) LEADS_STORE.pop();

    // Persist to Supabase via direct REST API (supabase-js was silently failing)
    try {
      const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const dbPayload: any = {
        id: lead.id,
        timestamp: lead.timestamp,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        space_type: lead.spaceType,
        budget: lead.budget,
        timeline: lead.timeline,
        team_size: lead.teamSize,
        additional_info: lead.additionalInfo,
        score: lead.score,
        score_label: lead.scoreLabel,
        reasoning: lead.reasoning,
        matched_properties: lead.matchedProperties,
        is_whale: lead.isWhale,
        whale_tier: lead.whaleTier,
        whale_keywords: lead.whaleKeywords,
        source: lead.source,
        medium: lead.medium,
        campaign: lead.campaign,
        session_id: sessionId || null,  // Link to analytics session
        follow_up_date: lead.followUpDate || null,
        created_by_employee: lead.createdByEmployee || "Staff",
        progress: lead.progress || "0-25%",
      };

      let insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(dbPayload),
      });

      if (!insertRes.ok && insertRes.status === 400) {
        const errJson = await insertRes.clone().json().catch(() => ({}));
        if (errJson.code === "42703" && dbPayload.progress !== undefined) {
          console.warn("[lease-bot REST insert] progress column does not exist, retrying without it");
          delete dbPayload.progress;
          insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify(dbPayload),
          });
        }
      }

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.error("Supabase REST insert failed:", insertRes.status, errText);
      } else {
        // Audit log — fire and forget
        writeActivityLog({
          actor_email:   actorEmail   || "unknown",
          actor_name:    actorName || actorEmail?.split("@")[0] || "Staff",
          action:        "created",
          resource_type: "lead",
          resource_name: lead.name,
          resource_id:   lead.id,
          metadata: {
            score:       lead.score,
            score_label: lead.scoreLabel,
            budget:      lead.budget,
            space_type:  lead.spaceType,
          },
        });
      }
    } catch (dbErr) {
      console.error("Supabase insert error:", dbErr);
    }

    // ── Send email notification to team ──────────────────────────────────────
    if (RESEND_API_KEY && LEAD_NOTIFY_TO.length > 0) {
      try {
        const scoreEmoji = lead.score >= 70 ? "🔥" : lead.score >= 40 ? "📋" : "📎";
        const budgetStr = lead.budget ? ` ($${lead.budget.toLocaleString()}/mo)` : "";
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: LEAD_NOTIFY_TO,
            reply_to: lead.email || undefined,
            subject: `${scoreEmoji} ${lead.scoreLabel}: ${lead.name} — ${lead.spaceType}${budgetStr}`,
            html: buildLeadEmailHtml(lead),
          }),
        });
        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("[lease-bot] Resend email error:", errText);
        }
      } catch (emailErr) {
        console.error("[lease-bot] Email notification failed:", emailErr);
      }
    } else {
      console.warn("[lease-bot] RESEND_API_KEY not set — lead email notification skipped");
    }

    return NextResponse.json({ success: true, lead });

  } catch (error) {
    console.error("Lease-Bot scoring error:", error);
    return NextResponse.json(
      { error: "Scoring failed — please try again" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&order=timestamp.desc&limit=50`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) throw new Error(`Supabase GET failed: ${res.status}`);
    const data = await res.json();

    const leads: Lead[] = (data || []).map(rowToLead);
    // Also sync into memory store so the same-process cache is warm
    LEADS_STORE.length = 0;
    LEADS_STORE.push(...leads);

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Supabase fetch error:", err);
    // Graceful fallback: return whatever is in-memory
    return NextResponse.json({ leads: LEADS_STORE });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, all } = body as { id?: string; all?: boolean };

    const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    };

    if (all) {
      // Bulk delete: remove ALL leads
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?id=not.is.null`,
        { method: "DELETE", headers }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error("Supabase bulk delete failed:", res.status, errText);
        return NextResponse.json({ error: "Bulk delete failed" }, { status: 500 });
      }
      LEADS_STORE.length = 0;
      return NextResponse.json({ success: true, deleted: "all" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
    }

    // Single delete via REST API (supabase-js was silently failing)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error("Supabase delete failed:", res.status, errText);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    // Remove from memory store
    const idx = LEADS_STORE.findIndex(l => l.id === id);
    if (idx !== -1) LEADS_STORE.splice(idx, 1);

    return NextResponse.json({ success: true, deleted: id });
  } catch (err) {
    console.error("Delete lead error:", err);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
