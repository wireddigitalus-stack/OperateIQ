import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Parse freeform budget text into a number for whale detection & analytics */
function parseBudgetNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = val.replace(/[$,]/g, "").trim();
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return Math.round((parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2);
  const numMatch = s.match(/^(\d+(?:\.\d+)?)\+?$/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
}

// POST — insert a manually-scored lead directly to Supabase
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  try {
    const body = await req.json();
    const {
      name, email, phone, spaceType, budget,
      timeline, teamSize, additionalInfo,
      score, scoreLabel, reasoning,
      followUpDate, createdByEmployee, progress,
    } = body;

    if (!name || !spaceType || !budget) {
      return NextResponse.json({ error: "name, spaceType, and budget are required" }, { status: 400 });
    }

    const budgetNum = parseBudgetNum(budget);
    const derivedLabel =
      score >= 70 ? "Verified Lead" : score >= 40 ? "MQL" : "Prospect Lead";

    // Whale detection — $4k+/mo = silver, $8k+/mo = gold
    const isWhale = budgetNum >= 4000;
    const whaleTier = budgetNum >= 8000 ? "gold" : budgetNum >= 4000 ? "silver" : null;

    const lead = {
      id: `manual_${Date.now()}`,
      org_id: orgId,
      timestamp: new Date().toISOString(),
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      space_type: spaceType,
      budget: String(budget).trim(),
      timeline: timeline || "Exploring options",
      team_size: teamSize || "Solo",
      additional_info: additionalInfo?.trim() || "",
      score: Number(score) || 50,
      score_label: scoreLabel || derivedLabel,
      reasoning: reasoning?.trim() || "Manually entered lead.",
      matched_properties: [],
      is_whale: isWhale,
      whale_tier: whaleTier,
      whale_keywords: [],
      source: body.source || "manual",
      medium: body.medium || "admin",
      campaign: body.campaign || "",
      follow_up_date: followUpDate || null,
      created_by_employee: createdByEmployee || body.actorName || "Staff",
      assigned_employee: body.assignedEmployee || "",
      progress: progress || "0-25%",
    };

    const dbPayload: any = { ...lead };
    let dbRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify(dbPayload),
    });

    if (!dbRes.ok && dbRes.status === 400) {
      const errJson = await dbRes.clone().json().catch(() => ({}));
      if (errJson.code === "42703" && dbPayload.progress !== undefined) {
        console.warn("[admin-lead REST POST] progress column does not exist, retrying without it");
        delete dbPayload.progress;
        dbRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Prefer": "return=representation",
          },
          body: JSON.stringify(dbPayload),
        });
      }
    }

    if (!dbRes.ok) {
      const err = await dbRes.text();
      console.error("Supabase insert error:", err);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }

    // Audit log — fire and forget
    writeActivityLog({
      org_id:        orgId,
      actor_email:   user?.email || body.actorEmail  || "unknown",
      actor_name:    body.actorName || user?.name || "Staff",
      action:        "created",
      resource_type: "lead",
      resource_name: lead.name,
      resource_id:   lead.id,
      metadata: { score: lead.score, score_label: lead.score_label, budget: lead.budget, space_type: lead.space_type },
    });

    // Return in the same shape as lease-bot so AdminPage can use it uniformly
    const returned = {
      id: lead.id,
      timestamp: lead.timestamp,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      spaceType: lead.space_type,
      budget: lead.budget,
      timeline: lead.timeline,
      teamSize: lead.team_size,
      additionalInfo: lead.additional_info,
      score: lead.score,
      scoreLabel: lead.score_label,
      reasoning: lead.reasoning,
      matchedProperties: [],
      isWhale: lead.is_whale,
      whaleTier: lead.whale_tier,
      whaleKeywords: [],
      source: lead.source,
      medium: lead.medium,
      campaign: lead.campaign,
      followUpDate: lead.follow_up_date,
      createdByEmployee: lead.created_by_employee,
      assignedEmployee: lead.assigned_employee,
      progress: lead.progress,
    };

    return NextResponse.json({ success: true, lead: returned });
  } catch (err) {
    console.error("admin-lead error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// PATCH — archive, unarchive, reschedule, or edit a lead
export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  try {
    const body = await req.json();
    const {
      id, archive, followUpDate, comment, actorName, actorEmail, leadName,
      name, email, phone, spaceType, budget, timeline, teamSize, additionalInfo, progress
    } = body;
    if (!id) return NextResponse.json({ error: "Missing lead id" }, { status: 400 });

    const patchPayload: Record<string, any> = {};

    if (archive !== undefined) {
      patchPayload.archived_at = archive ? new Date().toISOString() : null;
    }

    if (followUpDate !== undefined) {
      patchPayload.follow_up_date = followUpDate || null;
    }

    if (body.assignedEmployee !== undefined) {
      patchPayload.assigned_employee = body.assignedEmployee || "";
    }

    if (name !== undefined) patchPayload.name = name.trim();
    if (email !== undefined) patchPayload.email = email.trim();
    if (phone !== undefined) patchPayload.phone = phone.trim();
    if (spaceType !== undefined) patchPayload.space_type = spaceType;
    if (budget !== undefined) {
      patchPayload.budget = String(budget).trim();
      // Recalculate whale flags from parsed number
      const bNum = parseBudgetNum(budget);
      patchPayload.is_whale = bNum >= 4000;
      patchPayload.whale_tier = bNum >= 8000 ? "gold" : bNum >= 4000 ? "silver" : null;
    }
    if (timeline !== undefined) patchPayload.timeline = timeline;
    if (teamSize !== undefined) patchPayload.team_size = teamSize;
    if (additionalInfo !== undefined) patchPayload.additional_info = additionalInfo.trim();
    if (progress !== undefined) patchPayload.progress = progress;

    const url = `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`;
    const headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation",
    };

    let res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok && res.status === 400) {
      const errJson = await res.clone().json().catch(() => ({}));
      if (errJson.code === "42703" && patchPayload.progress !== undefined) {
        console.warn("[PATCH lead] progress column does not exist, retrying without it");
        delete patchPayload.progress;
        res = await fetch(url, {
          method: "PATCH",
          headers,
          body: JSON.stringify(patchPayload),
        });
      }
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("PATCH failed:", err);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    const updatedRows = await res.json().catch(() => []);
    if (Object.keys(patchPayload).length > 0 && (!Array.isArray(updatedRows) || updatedRows.length === 0)) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // If rescheduled and comment is provided, insert comment
    if (followUpDate !== undefined && comment && comment.trim()) {
      const commentRecord = {
        id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        org_id: orgId,
        lead_id: id,
        author: actorName?.trim() || "Staff",
        body: comment.trim(),
        timestamp: new Date().toISOString(),
      };
      const commentRes = await fetch(`${SUPABASE_URL}/rest/v1/lead_comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify(commentRecord),
      });
      if (!commentRes.ok) {
        console.error("Failed to insert follow-up comment:", await commentRes.text());
      }
    }

    const changedFields: string[] = [];
    if (name !== undefined) changedFields.push("name");
    if (email !== undefined) changedFields.push("email");
    if (phone !== undefined) changedFields.push("phone");
    if (spaceType !== undefined) changedFields.push("spaceType");
    if (budget !== undefined) changedFields.push("budget");
    if (timeline !== undefined) changedFields.push("timeline");
    if (teamSize !== undefined) changedFields.push("teamSize");
    if (additionalInfo !== undefined) changedFields.push("notes");
    if (progress !== undefined) changedFields.push("progress");

    let logMetadata: any = {};
    if (archive !== undefined) {
      logMetadata = { archived: archive };
    } else if (followUpDate !== undefined && changedFields.length === 0) {
      logMetadata = { follow_up_date: followUpDate };
    } else {
      logMetadata = { changed: changedFields.join(", ") };
    }

    writeActivityLog({
      org_id:        orgId,
      actor_email:   user?.email || actorEmail  || "unknown",
      actor_name:    actorName || user?.name || "Staff",
      action:        "updated",
      resource_type: "lead",
      resource_name: leadName || id,
      resource_id:   id,
      metadata: logMetadata,
    });

    return NextResponse.json({
      success: true,
      id,
      archivedAt: patchPayload.archived_at,
      followUpDate: patchPayload.follow_up_date,
      progress: patchPayload.progress,
    });
  } catch (err) {
    console.error("admin-lead PATCH error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
