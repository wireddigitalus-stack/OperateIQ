import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server-auth";
import { isSuperAdmin } from "@/lib/platform";
import { loadPlatformTeam, savePlatformTeam, type PlatformTeamMember } from "@/lib/platform-team";

export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  const members = await loadPlatformTeam();
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "add");
  const email = String(body.email || "").trim().toLowerCase();

  if (action === "add") {
    const name = String(body.name || "").trim().slice(0, 80);
    const canImpersonate = body.canImpersonate !== false;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (isSuperAdmin(email)) {
      return NextResponse.json({ error: "That email is already a full Master Admin." }, { status: 400 });
    }

    const members = await loadPlatformTeam();
    if (members.some((m) => m.email.toLowerCase() === email)) {
      return NextResponse.json({ error: "That email is already in the Tech Support team." }, { status: 409 });
    }

    const created: PlatformTeamMember = {
      email,
      name: name || email.split("@")[0],
      role: "tech_support",
      active: true,
      canImpersonate,
      addedBy: sa.ctx.email,
      createdAt: new Date().toISOString(),
    };

    const next = [created, ...members];
    await savePlatformTeam(next);
    return NextResponse.json({ ok: true, members: next });
  }

  if (action === "toggle_active") {
    const members = await loadPlatformTeam();
    const idx = members.findIndex((m) => m.email.toLowerCase() === email);
    if (idx === -1) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    members[idx] = { ...members[idx], active: !members[idx].active };
    await savePlatformTeam(members);
    return NextResponse.json({ ok: true, members });
  }

  if (action === "toggle_impersonate") {
    const members = await loadPlatformTeam();
    const idx = members.findIndex((m) => m.email.toLowerCase() === email);
    if (idx === -1) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    members[idx] = { ...members[idx], canImpersonate: !members[idx].canImpersonate };
    await savePlatformTeam(members);
    return NextResponse.json({ ok: true, members });
  }

  if (action === "remove") {
    const members = await loadPlatformTeam();
    const next = members.filter((m) => m.email.toLowerCase() !== email);
    await savePlatformTeam(next);
    return NextResponse.json({ ok: true, members });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
