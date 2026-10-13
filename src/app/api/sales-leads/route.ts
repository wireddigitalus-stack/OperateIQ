import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sales_leads?org_id=eq.${orgId}&order=created_at.desc`,
    { headers: H }
  );
  if (!res.ok) return NextResponse.json({ leads: [] });
  return NextResponse.json({ leads: await res.json() });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  try {
    const body = await req.json();
    const record = {
      id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      org_id: orgId,
      poc_name: body.pocName?.trim() || "",
      poc_phone: body.pocPhone?.trim() || "",
      poc_email: body.pocEmail?.trim() || "",
      building_interested: body.buildingInterested || "",
      progress: body.progress || "Inquire",
      deal_progress: body.dealProgress || "0-25%",
      listing_price: Number(body.listingPrice) || 0,
      quoted_price: Number(body.quotedPrice) || 0,
      counter_offer: Number(body.counterOffer) || 0,
      offer_price: Number(body.offerPrice) || 0,
      notes: body.notes?.trim() || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_leads`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Insert failed: ${err}` }, { status: 500 });
    }

    writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || "unknown",
      actor_name: user?.name || "Staff",
      action: "created",
      resource_type: "lead",
      resource_name: `${record.poc_name} (Sales)`,
      resource_id: record.id,
      metadata: { building: record.building_interested, progress: record.progress },
    });

    return NextResponse.json({ success: true, lead: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();

    const patchPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (body.pocName !== undefined) patchPayload.poc_name = body.pocName.trim();
    if (body.pocPhone !== undefined) patchPayload.poc_phone = body.pocPhone.trim();
    if (body.pocEmail !== undefined) patchPayload.poc_email = body.pocEmail.trim();
    if (body.buildingInterested !== undefined) patchPayload.building_interested = body.buildingInterested;
    if (body.progress !== undefined) patchPayload.progress = body.progress;
    if (body.dealProgress !== undefined) patchPayload.deal_progress = body.dealProgress;
    if (body.listingPrice !== undefined) patchPayload.listing_price = Number(body.listingPrice) || 0;
    if (body.quotedPrice !== undefined) patchPayload.quoted_price = Number(body.quotedPrice) || 0;
    if (body.counterOffer !== undefined) patchPayload.counter_offer = Number(body.counterOffer) || 0;
    if (body.offerPrice !== undefined) patchPayload.offer_price = Number(body.offerPrice) || 0;
    if (body.notes !== undefined) patchPayload.notes = body.notes.trim();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_leads?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Update failed: ${err}` }, { status: 500 });
    }

    writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || "unknown",
      actor_name: user?.name || "Staff",
      action: "updated",
      resource_type: "lead",
      resource_name: patchPayload.poc_name || id,
      resource_id: id,
      metadata: patchPayload,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_leads?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: H,
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
