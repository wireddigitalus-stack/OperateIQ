import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { profileForOrg } from "@/lib/org-ai-profile";
import { supabaseAdmin } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";

const MODEL = "gemini-2.5-flash";

// Lean lead type — optional client-side lead list (used by DailyBriefCard)
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
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (isNaN(diff) || diff < 0) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export async function POST(req: NextRequest) {
  // 1. Strict server-side authentication & tenant resolution.
  //    orgId is NEVER read from the request body or query params.
  const g = await requireOrg(req);
  if (!g.ok) return g.res;

  const orgId = g.ctx.orgId;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY environment variable is not set" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      question,
      leads: clientLeads,
      messages,
    } = body as {
      question?: string;
      leads?: LeanLead[];
      messages?: { role: "user" | "assistant"; content: string }[];
    };

    const activeQuestion =
      (question && String(question).trim()) ||
      (Array.isArray(messages) && messages.length > 0
        ? String(messages[messages.length - 1]?.content || "").trim()
        : "");

    if (!activeQuestion) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 2. Fetch live operational snapshot strictly scoped to `org_id = orgId`.
    //    Stateless per-request queries ensure zero cross-pollination between organizations.
    const [
      { data: dbProperties },
      { data: dbTenants },
      { data: dbRentPayments },
      { data: dbMaintenance },
      { data: dbCleaning },
      { data: dbLeads },
      { data: dbTodos },
    ] = await Promise.all([
      supabaseAdmin
        .from("properties")
        .select("name, address, city, type, sqft, lease_status, badge")
        .eq("org_id", orgId)
        .limit(40),
      supabaseAdmin
        .from("tenants")
        .select("name, contact_name, building, unit, monthly_rent, lease_end, status, email, phone")
        .eq("org_id", orgId)
        .limit(60),
      supabaseAdmin
        .from("rent_payments")
        .select("tenant_name, building, month, rent_due, nn_fee, nnn_fee, utility_fee, cleaning_fee, cam_fee, late_fee, amount_paid, paid")
        .eq("org_id", orgId)
        .eq("month", currentMonth)
        .limit(60),
      supabaseAdmin
        .from("maintenance_tickets")
        .select("title, building, unit, priority, status, assigned_to, created_at")
        .eq("org_id", orgId)
        .neq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("cleaning_assignments")
        .select("property, area, worker_name, scheduled_date, status")
        .eq("org_id", orgId)
        .order("scheduled_date", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("leads")
        .select("name, space_type, budget, score, score_label, timeline, team_size, timestamp, phone, is_whale, progress, archived_at")
        .eq("org_id", orgId)
        .order("timestamp", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("todos")
        .select("task, description, priority, status, assigned_to, is_private, created_by")
        .eq("org_id", orgId)
        .neq("status", "done")
        .limit(30),
    ]);

    const propertiesList = dbProperties || [];
    const tenantsList = dbTenants || [];
    const rentList = dbRentPayments || [];
    const openTickets = dbMaintenance || [];
    const cleaningList = dbCleaning || [];
    const activeDbLeads = (dbLeads || []).filter((l: { archived_at?: string | null }) => !l.archived_at);

    // Format Properties
    const propertiesContext =
      propertiesList.length > 0
        ? propertiesList
            .map(
              (p: Record<string, unknown>, i: number) =>
                `${i + 1}. ${p.name} (${p.type || "Commercial"}) — ${p.address || ""} ${p.city || ""} | ${p.sqft || "N/A"} | Status: ${p.lease_status || "available"}${p.badge ? ` (${p.badge})` : ""}`
            )
            .join("\n")
        : "No properties added to this workspace yet.";

    // Format Tenants & Rent Roll
    const totalMonthlyRentRoll = tenantsList.reduce(
      (sum: number, t: Record<string, unknown>) => sum + (Number(t.monthly_rent) || 0),
      0
    );
    const tenantsContext =
      tenantsList.length > 0
        ? tenantsList
            .slice(0, 25)
            .map(
              (t: Record<string, unknown>, i: number) =>
                `${i + 1}. ${t.name}${t.contact_name ? ` (${t.contact_name})` : ""} @ ${t.building || "Unassigned"}${t.unit ? ` #${t.unit}` : ""} | Rent: $${Number(t.monthly_rent || 0).toLocaleString()}/mo | Lease Ends: ${t.lease_end || "N/A"} | Status: ${t.status || "active"}`
            )
            .join("\n")
        : "No active tenants recorded yet.";

    // Format Current Month Rent Ledger
    const unpaidRent = rentList.filter(
      (r: Record<string, unknown>) => !r.paid
    );
    const rentLedgerContext =
      rentList.length > 0
        ? `Month ${currentMonth}: ${rentList.length - unpaidRent.length}/${rentList.length} paid. Unpaid/Pending: ${
            unpaidRent.length > 0
              ? unpaidRent
                  .slice(0, 15)
                  .map((r: Record<string, unknown>) => {
                    const totalDue =
                      (Number(r.rent_due) || 0) +
                      (Number(r.nn_fee) || 0) +
                      (Number(r.nnn_fee) || 0) +
                      (Number(r.utility_fee) || 0) +
                      (Number(r.cleaning_fee) || 0) +
                      (Number(r.cam_fee) || 0) +
                      (Number(r.late_fee) || 0);
                    const paidAmt = Number(r.amount_paid) || 0;
                    return `${r.tenant_name} (${r.building || "Building"}): $${totalDue.toLocaleString()}${paidAmt > 0 ? ` ($${paidAmt.toLocaleString()} paid)` : ""} [unpaid]`;
                  })
                  .join("; ")
              : "None — 100% collected!"
          }`
        : `No rent ledger entries recorded for ${currentMonth} yet.`;

    // Format Open Maintenance Work Orders
    const maintenanceContext =
      openTickets.length > 0
        ? openTickets
            .slice(0, 15)
            .map(
              (m: Record<string, unknown>, i: number) =>
                `${i + 1}. [${String(m.priority || "normal").toUpperCase()}] ${m.title} @ ${m.building || "General"}${m.unit ? ` (${m.unit})` : ""} | Status: ${m.status} | Assigned: ${m.assigned_to || "Unassigned"} (${timeAgo(String(m.created_at || ""))})`
            )
            .join("\n")
        : "0 open maintenance tickets.";

    // Format Cleaning Assignments
    const pendingCleaning = cleaningList.filter(
      (c: Record<string, unknown>) => c.status !== "done"
    );
    const cleaningContext =
      cleaningList.length > 0
        ? `${pendingCleaning.length} pending / ${cleaningList.length} recent assignments. Pending: ${
            pendingCleaning
              .slice(0, 10)
              .map((c: Record<string, unknown>) => `${c.property}${c.area ? ` - ${c.area}` : ""} (${c.worker_name || "Unassigned"}, ${c.scheduled_date || ""})`)
              .join("; ") || "All complete!"
          }`
        : "No cleaning assignments scheduled.";

    // Format Leads (use clientLeads if supplied by DailyBriefCard, otherwise live DB leads for this org)
    const leadsContext =
      Array.isArray(clientLeads) && clientLeads.length > 0
        ? clientLeads
            .slice(0, 15)
            .map(
              (l, i) =>
                `${i + 1}. ${l.name} | ${l.spaceType} | $${l.budget}/mo | Score: ${l.score} (${l.scoreLabel}) | Timeline: ${l.timeline} | Team: ${l.teamSize} | ${timeAgo(l.timestamp)}${l.phone ? " | ☎" : ""}${l.isWhale ? ` | ⭐ WHALE ALERT [${(l.whaleKeywords || []).join(", ")}]` : ""}`
            )
            .join("\n")
        : activeDbLeads.length > 0
        ? activeDbLeads
            .slice(0, 15)
            .map(
              (l: Record<string, unknown>, i: number) =>
                `${i + 1}. ${l.name} | ${l.space_type || "Commercial"} | $${Number(l.budget || 0).toLocaleString()}/mo | Score: ${l.score || 50} (${l.score_label || "Lead"}) | Timeline: ${l.timeline || "Flexible"} | ${timeAgo(String(l.timestamp || ""))}${l.is_whale ? " | ⭐ WHALE" : ""}`
            )
            .join("\n")
        : "No leads in pipeline yet.";

    // Format Open Team Tasks (respecting private todo ownership)
    const callerEmail = g.ctx.user?.email?.toLowerCase() || "";
    const callerName = g.ctx.user?.name?.toLowerCase() || "";
    const visibleTodos = (dbTodos || []).filter(
      (t: Record<string, unknown>) =>
        !t.is_private ||
        g.ctx.role === "owner" ||
        g.ctx.isSuperAdmin ||
        (Boolean(callerEmail) &&
          (String(t.created_by || "").toLowerCase() === callerEmail ||
            String(t.assigned_to || "").toLowerCase() === callerEmail)) ||
        (Boolean(callerName) &&
          (String(t.created_by || "").toLowerCase() === callerName ||
            String(t.assigned_to || "").toLowerCase() === callerName))
    );
    const todosContext =
      visibleTodos.length > 0
        ? visibleTodos
            .slice(0, 10)
            .map(
              (t: Record<string, unknown>) =>
                `- [${String(t.priority || "medium").toUpperCase()}] ${t.task}${t.assigned_to ? ` (Assigned: ${t.assigned_to})` : ""}${t.description ? ` — ${t.description}` : ""}`
            )
            .join("\n")
        : "No open team tasks.";

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const org = profileForOrg(g.ctx.org);

    const systemPrompt = `You are Ask ${BRAND.assistant} — the private AI Chief Operating Officer for ${org.name}${org.location ? ` (${org.location})` : ""}.
SECURITY & ISOLATION MANDATE: You are strictly isolated to ${org.name}'s workspace (org_id: ${orgId}). You only have access to ${org.name}'s own data below and never share or reference data from any other organization.

Today: ${today}
Current Plan Tier: ${g.ctx.org.tier.toUpperCase()}
Customer Support Code (Account ID): ${g.ctx.org.customer_code}

=== LIVE PORTFOLIO SNAPSHOT FOR ${org.name.toUpperCase()} ===
• Properties (${propertiesList.length}):
${propertiesContext}

• Active Tenants (${tenantsList.length} tenants · Total Monthly Rent Roll: $${totalMonthlyRentRoll.toLocaleString()}/mo):
${tenantsContext}

• Rent Collection (${currentMonth}):
${rentLedgerContext}

• Open Maintenance Work Orders (${openTickets.length}):
${maintenanceContext}

• Cleaning Operations:
${cleaningContext}

• Leasing Lead Pipeline (${Array.isArray(clientLeads) && clientLeads.length ? clientLeads.length : activeDbLeads.length} leads):
${leadsContext}

• Open Team Tasks (${visibleTodos.length}):
${todosContext}

INSTRUCTIONS:
- Be direct, executive, and actionable.
- Name specific buildings, tenants, leads, dollar amounts, and priorities from ${org.name}'s live data above.
- Keep responses concise (under 110 words unless the user asks for a detailed list).
- Plain text only (no markdown ### headings). Complete every sentence.`;

    const contents =
      Array.isArray(messages) && messages.length > 0
        ? messages
            .slice(-10)
            .filter((m) => m?.content)
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: String(m.content).slice(0, 2000) }],
            }))
        : [{ role: "user", parts: [{ text: activeQuestion }] }];

    while (contents.length && contents[0].role !== "user") contents.shift();

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 900,
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

    return NextResponse.json({
      response,
      orgName: org.name,
      stats: {
        propertiesCount: propertiesList.length,
        tenantsCount: tenantsList.length,
        openTicketsCount: openTickets.length,
        activeLeadsCount: Array.isArray(clientLeads) && clientLeads.length ? clientLeads.length : activeDbLeads.length,
      },
    });
  } catch (error: unknown) {
    console.error("Ask PropOpsIQ error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
