import { NextRequest, NextResponse } from "next/server";
import { getOrgProfile, type OrgProfile } from "@/lib/org-profile";
import { requireOrg } from "@/lib/server-auth";
import { profileForOrg } from "@/lib/org-ai-profile";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── Market region ─────────────────────────────────────────────────────────
// MARKET_INTEL_REGION is a Google News boolean expression, e.g.
//   "Texas OR Oklahoma"  or  "\"Austin\" OR \"Travis County\""
// When unset, queries fall back to national US commercial real estate news.
const MARKET_REGION = (process.env.MARKET_INTEL_REGION || "").trim();

// ── Google News RSS search queries ────────────────────────────────────────
// Queries exclude UK/Europe to keep results focused on the US market.
const UK_EXCLUDE = `-UK -England -Europe -London -"United Kingdom"`;

function buildSearchQueries(): string[] {
  if (MARKET_REGION) {
    const r = `(${MARKET_REGION})`;
    return [
      `("relocating headquarters" OR "opening new office" OR "expanding operations") ${r} ${UK_EXCLUDE}`,
      `("company closing" OR "business closing" OR "layoffs") ${r} ${UK_EXCLUDE}`,
      `("new headquarters" OR "moving headquarters") ${r} ${UK_EXCLUDE}`,
      `("commercial real estate" OR "office market" OR "vacancy rate") ${r} ${UK_EXCLUDE}`,
      `("business law" OR "tax incentive" OR "economic development") ${r} ${UK_EXCLUDE}`,
      `("property management" OR "commercial lease" OR "commercial development") ${r} ${UK_EXCLUDE}`,
    ];
  }
  // National US fallback
  return [
    `("commercial real estate" OR "office market" OR "vacancy rate") "United States" ${UK_EXCLUDE}`,
    `("relocating headquarters" OR "opening new office" OR "expanding operations") US ${UK_EXCLUDE}`,
    `("property management" OR "landlord" OR "commercial lease") US ${UK_EXCLUDE}`,
    `("commercial property" OR "industrial real estate" OR "retail real estate") trends US ${UK_EXCLUDE}`,
    `("interest rates" OR "CRE lending" OR "commercial mortgage") real estate US ${UK_EXCLUDE}`,
  ];
}
const SEARCH_QUERIES = buildSearchQueries();

// ── Regional business RSS feeds ───────────────────────────────────────────
const RSS_FEEDS = [
  {
    name: "Business Wire — Real Estate",
    url: "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeGVtRWA==",
  },
  {
    name: "PR Newswire — Real Estate",
    url: "https://www.prnewswire.com/rss/real-estate-news.rss",
  },
];

// ── Parse XML to extract RSS items ────────────────────────────────────────
interface FeedItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string;
}

function extractItems(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")?.trim() || "";
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")?.trim() || "";
    const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")?.replace(/<[^>]+>/g, "")?.trim() || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    if (title) {
      items.push({
        title: decodeHTMLEntities(title),
        link: decodeHTMLEntities(link),
        snippet: decodeHTMLEntities(desc).slice(0, 300),
        source,
        pubDate,
      });
    }
  }
  return items;
}

function decodeHTMLEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ── Fetch one feed with timeout ───────────────────────────────────────────
async function fetchFeed(url: string, source: string): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "OperateIQ-MarketIntel/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return extractItems(xml, source);
  } catch {
    return [];
  }
}

// ── AI scoring ────────────────────────────────────────────────────────────
async function scoreWithAI(items: FeedItem[], profile?: OrgProfile): Promise<{ title: string; link: string; source: string; pubDate: string; score: string; reason: string }[]> {
  if (!GEMINI_API_KEY || items.length === 0) {
    console.warn("[MarketIntel] No GEMINI_API_KEY or empty items — skipping AI scoring");
    return items.map(i => ({
      title: i.title,
      link: i.link,
      source: i.source,
      pubDate: i.pubDate,
      score: "unknown",
      reason: GEMINI_API_KEY ? "No items to score" : "AI key not configured — add GEMINI_API_KEY to .env",
    }));
  }

  const org = profile || getOrgProfile();
  const regionLabel = MARKET_REGION
    ? MARKET_REGION.replace(/"/g, "").replace(/\s+OR\s+/gi, " / ")
    : "the United States (national)";

  const prompt = `You are a commercial real estate market analyst for ${org.name}, a property firm based in ${org.location} (USA).
The market region of interest is: ${regionLabel}.

STRICT GEOGRAPHIC FILTER:
- ONLY score articles relevant to ${MARKET_REGION ? `the configured region (${regionLabel})` : "the United States"}.
- Any article about ${MARKET_REGION ? "other regions, " : ""}the UK, Europe, Asia, or international locations = "skip".
- Place names that are ambiguous (e.g. a US city name shared with a non-US city) without clear US context = "skip".

WHAT IS RELEVANT to ${org.name}:
- Companies relocating TO or expanding IN ${regionLabel}
- Company closures or layoffs in ${regionLabel} (creates vacant commercial space = opportunity)
- New business laws, tax incentives, or economic development programs affecting ${regionLabel}
- Commercial real estate market data for ${regionLabel} (vacancy rates, lease rates, market trends)
- New business openings or headquarters announcements in ${regionLabel}
- Infrastructure or development projects in ${regionLabel} that affect CRE

WHAT IS NOT RELEVANT (mark as "skip"):
- Residential real estate, housing market
- Sports, entertainment, politics unrelated to business/CRE
${MARKET_REGION ? `- Articles about places outside ${regionLabel}\n` : ""}- International news of any kind
${MARKET_REGION ? `- General national business news with no connection to ${regionLabel}\n` : ""}
Score each item:
- "hot" = Directly about commercial real estate, company relocation, or major business opening/closing in ${regionLabel}${MARKET_REGION ? ` (especially near ${org.location})` : ""}
- "warm" = Business/economic news for ${regionLabel} that could indirectly affect CRE demand
- "cold" = Tangentially related to ${regionLabel} but low direct CRE impact
- "skip" = Not relevant to ${regionLabel}, or completely irrelevant to commercial real estate

Return ONLY a valid JSON array. Each object: {"index": number, "score": "hot"|"warm"|"cold"|"skip", "reason": "one sentence why"}

Items to analyze:
${items.map((item, i) => `[${i}] "${item.title}" — ${item.snippet.slice(0, 150)}`).join("\n")}`;

  try {
    const MODEL = "gemini-2.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[MarketIntel] Gemini API HTTP error:", res.status, errText.slice(0, 500));
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = await res.json();

    // Debug: log the full response structure (keys only)
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      console.error("[MarketIntel] No candidates in response. Full response keys:", Object.keys(data || {}));
      console.error("[MarketIntel] Possible content filter block:", JSON.stringify(data?.promptFeedback || {}).slice(0, 300));
      throw new Error("No candidates returned");
    }

    // Gemini 2.5 may return parts with { thought: true, text: "..." } for thinking
    // and { text: "..." } for actual response. We want the non-thought parts.
    const parts = candidate.content?.parts || [];
    console.log("[MarketIntel] Parts count:", parts.length, "Part types:", parts.map((p: Record<string, unknown>) => p.thought ? "thought" : "text").join(", "));

    // Collect text from non-thought parts; fall back to all parts if no non-thought parts
    const responseParts = parts.filter((p: Record<string, unknown>) => !p.thought && typeof p.text === "string");
    const fallbackParts = parts.filter((p: Record<string, unknown>) => typeof p.text === "string");
    const usableParts = responseParts.length > 0 ? responseParts : fallbackParts;
    const raw = usableParts.map((p: Record<string, unknown>) => p.text as string).join("\n");

    if (!raw.trim()) {
      console.error("[MarketIntel] No text content in parts. Full parts:", JSON.stringify(parts).slice(0, 500));
      throw new Error("Empty response text");
    }

    console.log("[MarketIntel] Raw AI response (first 400 chars):", raw.slice(0, 400));

    // Extract JSON array from the response
    let jsonStr = raw;
    // Remove markdown code fences
    jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    // Find the JSON array
    const startBracket = jsonStr.indexOf("[");
    const endBracket = jsonStr.lastIndexOf("]");
    if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
      jsonStr = jsonStr.slice(startBracket, endBracket + 1);
    }
    // Fix trailing commas
    jsonStr = jsonStr.replace(/,\s*]/g, "]");

    let scores: { index: number; score: string; reason: string }[];
    try {
      scores = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[MarketIntel] JSON parse failed. Attempting regex fallback. Parse error:", parseErr);
      console.error("[MarketIntel] jsonStr (first 500):", jsonStr.slice(0, 500));
      // Regex fallback: extract individual objects
      scores = [];
      const objRegex = /\{\s*"index"\s*:\s*(\d+)\s*,\s*"score"\s*:\s*"(hot|warm|cold|skip)"\s*,\s*"reason"\s*:\s*"([^"]*)"/g;
      let m;
      while ((m = objRegex.exec(raw)) !== null) {
        scores.push({ index: parseInt(m[1], 10), score: m[2], reason: m[3] });
      }
      console.log("[MarketIntel] Regex fallback extracted", scores.length, "scores");
    }

    return items.map((item, i) => {
      const s = scores.find(sc => sc.index === i);
      return {
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate,
        score: s?.score || "unknown",
        reason: s?.reason || "",
      };
    });
  } catch (err) {
    console.error("[MarketIntel] AI scoring failed:", err);
    return items.map(i => ({
      title: i.title,
      link: i.link,
      source: i.source,
      pubDate: i.pubDate,
      score: "unknown",
      reason: "AI scoring temporarily unavailable",
    }));
  }
}

// ── GET Handler ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "market_intel" });
  if (!g.ok) return g.res;

  try {
    // 1. Fetch Google News RSS for each query
    const googlePromises = SEARCH_QUERIES.map(q => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:3m")}&hl=en-US&gl=US&ceid=US:en`;
      return fetchFeed(url, "Google News");
    });

    // 2. Fetch regional feeds
    const rssPromises = RSS_FEEDS.map(f => fetchFeed(f.url, f.name));

    const allResults = await Promise.all([...googlePromises, ...rssPromises]);
    const allItems = allResults.flat();

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const unique = allItems.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out articles older than 90 days
    const ninetyDaysAgo = Date.now() - 90 * 86400000;
    const recent = unique.filter(item => {
      if (!item.pubDate) return true; // keep items with no date (let AI decide)
      const d = new Date(item.pubDate).getTime();
      return !isNaN(d) ? d >= ninetyDaysAgo : true;
    });

    // Limit to 25 most recent
    const capped = recent.slice(0, 25);

    // 3. Score with AI
    const scored = await scoreWithAI(capped, profileForOrg(g.ctx.org));

    // Filter out "skip" items and sort by score
    const scoreOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2, unknown: 3 };
    const filtered = scored
      .filter(s => s.score !== "skip")
      .sort((a, b) => (scoreOrder[a.score] ?? 9) - (scoreOrder[b.score] ?? 9));

    return NextResponse.json({
      items: filtered,
      fetchedAt: new Date().toISOString(),
      totalScanned: allItems.length,
      totalRelevant: filtered.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch market intel" },
      { status: 500 }
    );
  }
}
