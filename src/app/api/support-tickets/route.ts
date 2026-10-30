import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin, getRequestContext } from "@/lib/server-auth";
import { getCustomerCode, DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform";
import { platformOrgId } from "@/lib/platform-org";

export interface SupportTicketItem {
  id: string;
  submitted_at: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  category: string;
  priority: "Normal" | "High" | "Urgent";
  status: "Open" | "Resolved";
  customer_code: string;
  org_id: string | null;
  message: string;
  resolution_note?: string;
}

function parseTicketRow(
  row: Record<string, unknown>,
  orgLookupById: Map<string, { id: string; name: string; customer_code: string }>,
  orgLookupByCode: Map<string, { id: string; name: string; customer_code: string }>
): SupportTicketItem {
  const rawInterest = String(row.interest || "Tech Support");
  const rawCity = String(row.city || "");
  const rawMsg = String(row.message || "");

  // Extract category from "Support Ticket · <Category>" or fallback to interest
  const category = rawInterest.includes("·")
    ? rawInterest.split("·").slice(1).join("·").trim()
    : rawInterest.replace(/^Support Ticket:?\s*/i, "").trim() || "General Support";

  // Extract priority from city or message tag
  let priority: "Normal" | "High" | "Urgent" = "Normal";
  if (/\[Urgent\]/i.test(rawCity) || /\[Priority:\s*Urgent\]/i.test(rawMsg)) {
    priority = "Urgent";
  } else if (/\[High\]/i.test(rawCity) || /\[Priority:\s*High\]/i.test(rawMsg)) {
    priority = "High";
  }

  // Extract status from message tag or city tag
  const isResolved =
    /\[Status:\s*Resolved\]/i.test(rawMsg) || /\[Resolved\]/i.test(rawCity);
  const status: "Open" | "Resolved" = isResolved ? "Resolved" : "Open";

  // Extract customer code OIQ-XXXX from city, message, or org_id
  const codeMatch =
    rawCity.match(/\b(OIQ-[A-Z0-9]{4,8})\b/i) ||
    rawMsg.match(/\b(OIQ-[A-Z0-9]{4,8})\b/i);
  let extractedCode = codeMatch ? codeMatch[1].toUpperCase() : "";

  let orgId = typeof row.org_id === "string" && row.org_id !== DEFAULT_PLATFORM_ORG_ID ? row.org_id : null;
  let companyName = String(row.company || "");

  if (orgId && orgLookupById.has(orgId)) {
    const matched = orgLookupById.get(orgId)!;
    if (!extractedCode) extractedCode = matched.customer_code;
    if (!companyName) companyName = matched.name;
  } else if (extractedCode && orgLookupByCode.has(extractedCode)) {
    const matched = orgLookupByCode.get(extractedCode)!;
    orgId = matched.id;
    if (!companyName) companyName = matched.name;
  }

  if (!extractedCode) {
    extractedCode = orgId ? getCustomerCode(orgId) : "OIQ-UNLINKED";
  }

  // Strip internal metadata header lines from clean user message
  const cleanMessage = rawMsg
    .replace(/^\[Support ID:[^\]]*\]\s*/i, "")
    .replace(/^\[Status:[^\]]*\]\s*/i, "")
    .replace(/^\[Priority:[^\]]*\]\s*/i, "")
    .trim();

  return {
    id: String(row.id || ""),
    submitted_at: String(row.submitted_at || new Date().toISOString()),
    name: String(row.name || "Customer"),
    email: String(row.email || ""),
    company: companyName || "Customer Workspace",
    phone: String(row.phone || ""),
    category,
    priority,
    status,
    customer_code: extractedCode,
    org_id: orgId,
    message: cleanMessage || rawMsg,
  };
}

/**
 * GET /api/support-tickets
 * Super-Admin endpoint: returns all support tickets submitted via /help or /contact
 */
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ tickets: [] });
    }

    const [{ data: orgs }, { data: submissions, error }] = await Promise.all([
      supabaseAdmin.from("organizations").select("id, name, contact_email"),
      supabaseAdmin
        .from("contact_submissions")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(150),
    ]);

    if (error) {
      console.warn("[support-tickets] fetch warning:", error.message);
      return NextResponse.json({ tickets: [] });
    }

    const orgLookupById = new Map<string, { id: string; name: string; customer_code: string }>();
    const orgLookupByCode = new Map<string, { id: string; name: string; customer_code: string }>();
    const orgLookupByEmail = new Map<string, { id: string; name: string; customer_code: string }>();

    for (const o of orgs || []) {
      const code = getCustomerCode(o.id);
      const entry = { id: o.id, name: o.name, customer_code: code };
      orgLookupById.set(o.id, entry);
      orgLookupByCode.set(code, entry);
      if (o.contact_email) {
        orgLookupByEmail.set(String(o.contact_email).toLowerCase().trim(), entry);
      }
    }

    const supportRows = (submissions || []).filter((r: Record<string, unknown>) => {
      const id = String(r.id || "");
      const interest = String(r.interest || "").toLowerCase();
      const message = String(r.message || "").toLowerCase();
      return (
        id.startsWith("support_") ||
        interest.includes("support") ||
        interest.includes("help") ||
        interest.includes("troubleshoot") ||
        message.includes("[support id:")
      );
    });

    const tickets: SupportTicketItem[] = supportRows.map((row: Record<string, unknown>) => {
      const parsed = parseTicketRow(row, orgLookupById, orgLookupByCode);
      if (!parsed.org_id && parsed.email) {
        const byEmail = orgLookupByEmail.get(parsed.email.toLowerCase().trim());
        if (byEmail) {
          parsed.org_id = byEmail.id;
          if (parsed.customer_code === "OIQ-UNLINKED") {
            parsed.customer_code = byEmail.customer_code;
          }
          if (parsed.company === "Customer Workspace") {
            parsed.company = byEmail.name;
          }
        }
      }
      return parsed;
    });

    return NextResponse.json({ tickets });
  } catch (err) {
    console.error("[support-tickets GET] error:", err);
    return NextResponse.json({ error: "Failed to load support tickets" }, { status: 500 });
  }
}

/**
 * POST /api/support-tickets
 * Public / Authenticated Customer / Super-Admin endpoint:
 * Submits a support request from the /help page (or logs one from /platform)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 200);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
    const phone = String(body.phone || "").trim().slice(0, 80);
    const company = String(body.company || "").trim().slice(0, 200);
    const category = String(body.category || "General Support").trim().slice(0, 120);
    const priorityRaw = String(body.priority || "Normal").trim();
    const priority: "Normal" | "High" | "Urgent" =
      priorityRaw === "Urgent" ? "Urgent" : priorityRaw === "High" ? "High" : "Normal";
    const message = String(body.message || "").trim().slice(0, 4000);
    const submittedCode = String(body.customerCode || "").trim().toUpperCase();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and issue description are required." },
        { status: 400 }
      );
    }

    // Try to resolve authenticated session org or match by customerCode
    let resolvedOrgId: string | null = typeof body.orgId === "string" ? body.orgId : null;
    let resolvedCompany = company;
    let resolvedCode = /^OIQ-[A-Z0-9]{4,8}$/.test(submittedCode) ? submittedCode : "";

    try {
      const ctx = await getRequestContext(req);
      if (ctx?.org) {
        if (!resolvedOrgId) resolvedOrgId = ctx.org.id;
        if (!resolvedCompany) resolvedCompany = ctx.org.name;
        if (!resolvedCode) resolvedCode = getCustomerCode(ctx.org.id);
      }
    } catch {
      // Non-blocking if submitted by an unauthenticated visitor on /help
    }

    if (supabaseAdmin && (!resolvedOrgId || !resolvedCode)) {
      const { data: orgs } = await supabaseAdmin
        .from("organizations")
        .select("id, name, contact_email");

      for (const o of orgs || []) {
        const code = getCustomerCode(o.id);
        if (
          (resolvedOrgId && o.id === resolvedOrgId) ||
          (resolvedCode && code === resolvedCode) ||
          (o.contact_email && String(o.contact_email).toLowerCase().trim() === email)
        ) {
          resolvedOrgId = o.id;
          if (!resolvedCode) resolvedCode = code;
          if (!resolvedCompany) resolvedCompany = o.name;
          break;
        }
      }
    }

    if (!resolvedCode) {
      resolvedCode = resolvedOrgId ? getCustomerCode(resolvedOrgId) : "OIQ-HELP";
    }

    const ticketId = `support_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const submittedAt = new Date().toISOString();

    if (supabaseAdmin) {
      const row = {
        id: ticketId,
        submitted_at: submittedAt,
        name,
        email,
        company: resolvedCompany || "PropOpsIQ Customer",
        phone,
        interest: `Support Ticket · ${category}`,
        city: `[${priority}] ${resolvedCode}`,
        message: `[Support ID: ${resolvedCode}] [Status: Open] [Priority: ${priority}]\n${message}`,
        org_id: resolvedOrgId || platformOrgId(),
      };

      const { error } = await supabaseAdmin.from("contact_submissions").insert(row);
      if (error) {
        console.warn("[support-tickets POST] DB insert warning:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketId,
        submitted_at: submittedAt,
        name,
        email,
        company: resolvedCompany || "PropOpsIQ Customer",
        phone,
        category,
        priority,
        status: "Open",
        customer_code: resolvedCode,
        org_id: resolvedOrgId,
        message,
      },
    });
  } catch (err) {
    console.error("[support-tickets POST] error:", err);
    return NextResponse.json(
      { error: "Could not submit support ticket. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/support-tickets
 * Super-Admin endpoint: toggle ticket status (Open / Resolved)
 */
export async function PATCH(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    const newStatus: "Open" | "Resolved" = body.status === "Resolved" ? "Resolved" : "Open";

    if (!id || !supabaseAdmin) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("contact_submissions")
      .select("message, city")
      .eq("id", id)
      .maybeSingle();

    const prevMsg = String(existing?.message || "");
    const updatedMsg = /\[Status:\s*(Open|Resolved)\]/i.test(prevMsg)
      ? prevMsg.replace(/\[Status:\s*(Open|Resolved)\]/i, `[Status: ${newStatus}]`)
      : `[Status: ${newStatus}]\n${prevMsg}`;

    const { error } = await supabaseAdmin
      .from("contact_submissions")
      .update({ message: updatedMsg })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, status: newStatus });
  } catch (err) {
    console.error("[support-tickets PATCH] error:", err);
    return NextResponse.json({ error: "Failed to update support ticket" }, { status: 500 });
  }
}

/**
 * DELETE /api/support-tickets?id=...
 * Super-Admin endpoint: delete a support ticket
 */
export async function DELETE(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  try {
    const id = new URLSearchParams(req.url.split("?")[1] || "").get("id")?.trim();
    if (!id || !supabaseAdmin) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("contact_submissions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[support-tickets DELETE] error:", err);
    return NextResponse.json({ error: "Failed to delete support ticket" }, { status: 500 });
  }
}
