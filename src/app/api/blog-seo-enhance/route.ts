import { NextRequest, NextResponse } from "next/server";
import { orgContactLine } from "@/lib/org-profile";
import { requireOrg } from "@/lib/server-auth";
import { profileForOrg } from "@/lib/org-ai-profile";
import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform-org";
import { GEO_PAGES, PROPERTIES } from "@/lib/data";

const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const MODEL      = "gemini-2.5-flash";
const ENDPOINT   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

/**
 * POST /api/blog-seo-enhance
 *
 * Accepts the current blog post fields and returns:
 *  - metaTitle        (55–60 chars, keyword-dense)
 *  - metaDescription  (145–155 chars, local keyword + CTA)
 *  - excerpt          (2 punchy sentences)
 *  - enhancedContent  (article body with geo/SEO terms woven in naturally)
 *  - seoNotes         (plain-English explanation of what changed and why)
 */
export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "blog" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const isDemo = orgId === DEFAULT_PLATFORM_ORG_ID;

  const { title, content, category, tags, currentMeta, currentExcerpt } = await req.json();

  if (!title || !content) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  // Truncate content for very long articles (keep first 6000 chars — enough for full context)
  const contentSample = content.length > 6000 ? content.slice(0, 6000) + "\n\n[... article continues ...]" : content;

  const org = profileForOrg(g.ctx.org);
  const contact = orgContactLine(org);

  let tenantProps: { name?: string; city?: string }[] = [];
  if (!isDemo && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&select=name,city`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: "no-store",
      });
      if (pRes.ok) {
        const rows = await pRes.json();
        if (Array.isArray(rows)) tenantProps = rows;
      }
    } catch {
      /* ignore */
    }
  }

  const geoTerms = Array.from(new Set([
    org.location,
    g.ctx.org.city || "",
    g.ctx.org.state || "",
    ...tenantProps.map((p) => p.city || ""),
    ...(isDemo
      ? GEO_PAGES.flatMap((gp) => [
          `${gp.city} ${gp.state}`,
          gp.region,
          gp.countyName,
          gp.zipCode ? `zip ${gp.zipCode}` : "",
          ...gp.neighborhoods,
          ...gp.nearbyHighways,
        ])
      : []),
  ].filter(Boolean))).join(", ");
  const brandTerms = [
    org.name,
    ...(isDemo ? PROPERTIES.map((p) => p.name) : tenantProps.map((p) => p.name).filter(Boolean)),
  ].join(", ");

  const prompt = `You are a specialist in LOCAL SEO for commercial real estate in ${org.location}.

Your job is to analyse an existing blog article written by the ${org.name} team and produce two outputs:
1. Optimised SEO metadata (meta title, meta description, excerpt) — these are NEWLY WRITTEN, not edits to existing text
2. A geo-enhanced version of the article body — same article, same voice, same facts — but with local geographic context woven in naturally wherever it genuinely helps a reader or search engine understand location

## ARTICLE DETAILS
Title: ${title}
Category: ${category || "Market Reports"}
Tags: ${(tags || []).join(", ")}
Current meta description: ${currentMeta || "(none — must be generated)"}
Current excerpt: ${currentExcerpt || "(none — must be generated)"}

## ARTICLE BODY
${contentSample}

## YOUR TASK

### For SEO Metadata
Write tight, proven SEO copy:
- metaTitle: 55–60 characters. Must include the primary local keyword AND the city/region. Format: "[Topic] in [Location] | ${org.name}". Never exceed 60 chars.
- metaDescription: 145–155 characters EXACTLY. Must include: (a) the primary keyword, (b) a specific local geographic reference (city, region, or specific zip/county from the term bank), (c) a clear call to action. Proven format: "[What the article covers]. ${org.name} — [location]-based [value prop]. [CTA]."
- excerpt: 2 sentences max, 200–250 characters total. Punchy. States the specific value the article delivers. No generic phrases like "In this article we discuss".

### For Content Enhancement
Enhance the article body for local SEO. Rules you MUST follow:
1. DO NOT change the article's meaning, claims, or structure
2. DO NOT add more than 4–6 new geographic references total — quality over quantity
3. Only add location context where it would genuinely help a reader understand the local context (e.g. "the downtown ${org.location} market" instead of just "the market")
4. Natural is non-negotiable. If it reads like keyword stuffing, revert it.
5. Strengthen any weak calls to action to ${contact ? `mention ${org.name}'s contact details (${contact})` : `invite readers to contact ${org.name}`}
6. Return the FULL enhanced article — not just changed sections

## LOCAL SEO TERM BANK (use naturally, not all at once)
Geographic: ${geoTerms}
Property-specific: Class-A office, commercial real estate, coworking space, executive suites, retail space, adaptive reuse, historic tax credit
Brand: ${brandTerms}

## OUTPUT FORMAT
Return ONLY valid JSON, no markdown wrapper:
{
  "metaTitle": "string (55-60 chars)",
  "metaDescription": "string (145-155 chars)",
  "excerpt": "string (2 sentences, 200-250 chars)",
  "enhancedContent": "string (full article HTML with enhancements)",
  "seoNotes": "string — plain English bullet points explaining what was added/changed and why, max 5 bullets, use • character"
}`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,         // Lower temperature = more precise, less creative invention
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[blog-seo-enhance] Gemini error:", err);
      return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
    }

    const data   = await res.json();
    const parts  = data.candidates?.[0]?.content?.parts ?? [];
    const raw    = parts
      ?.filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    const json   = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(json);

    // Validate character counts and warn if off
    const meta = parsed.metaDescription ?? "";
    const metaLen = meta.length;
    if (metaLen < 140 || metaLen > 160) {
      console.warn(`[blog-seo-enhance] Meta description is ${metaLen} chars (target 145–155)`);
    }

    return NextResponse.json({ success: true, ...parsed });

  } catch (err) {
    console.error("[blog-seo-enhance] Error:", err);
    return NextResponse.json({ error: "SEO enhancement failed. Please try again." }, { status: 500 });
  }
}
