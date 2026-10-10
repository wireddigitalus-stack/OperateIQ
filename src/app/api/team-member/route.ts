import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  "Content-Type": "application/json",
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

/**
 * Mirrors the admin dashboard's nameToSlug() so the meet page can
 * resolve any slug back to the full name + title from allowed_users.
 */
function nameToSlug(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  return parts.find((p) => p.length > 2) ?? parts[0];
}

// GET /api/team-member?slug=allen
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.toLowerCase().trim();
  if (!slug) {
    return NextResponse.json({ name: "Vision LLC", title: "Commercial Real Estate" });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/allowed_users?active=eq.true&select=name,role`,
      { headers: H }
    );
    if (!res.ok) {
      return NextResponse.json({ name: "Vision LLC", title: "Commercial Real Estate" });
    }

    const users: { name: string; role: string }[] = await res.json();

    // Find the user whose name produces the matching slug
    const match = users.find((u) => u.name && nameToSlug(u.name) === slug);

    if (match) {
      // Build a friendly title from their role
      const roleMap: Record<string, string> = {
        owner: "Principal Broker",
        admin: "Vision LLC Team",
        manager: "Property Manager",
        staff: "Vision LLC Team",
      };
      return NextResponse.json({
        name: match.name,
        title: roleMap[match.role] || "Vision LLC Team",
      });
    }

    return NextResponse.json({ name: "Vision LLC", title: "Commercial Real Estate" });
  } catch {
    return NextResponse.json({ name: "Vision LLC", title: "Commercial Real Estate" });
  }
}
