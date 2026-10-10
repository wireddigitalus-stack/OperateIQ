// ─── Whale Detector ───────────────────────────────────────────────────────────
// Parses free-text fields for high-intent CRE terminology.
// Gold Whale = immediate priority. Silver = elevated intent.

export type WhaleTier = "gold" | "silver" | null;

export interface WhaleResult {
  isWhale: boolean;
  whaleTier: WhaleTier;
  whaleKeywords: string[];
}

// Single match from this list → Gold Whale
const HIGH_INTENT_TERMS = [
  "1031 exchange",
  "triple net",
  "triple-net",
  "nnn lease",
  "nnn",
  "cap rate",
  "sale-leaseback",
  "sale leaseback",
  "ground lease",
  "absolute net",
  "corporate headquarters",
  "regional office",
  "anchor tenant",
  "national tenant",
  "multi-location",
  "multiple locations",
  "ready to sign",
  "ready to lease",
  "board approved",
  "cash deal",
  "portfolio acquisition",
  "franchise agreement",
  "executive suite",
  "entire floor",
  "full building",
];

// Two or more matches from this list → Gold; one match → Silver
const MEDIUM_INTENT_TERMS = [
  "expanding",
  "expansion",
  "relocation",
  "relocating",
  "second location",
  "immediately",
  "asap",
  "right away",
  "this week",
  "this month",
  "long-term",
  "long term",
  "5-year",
  "10-year",
  "multi-year",
  "build-out",
  "buildout",
  "tenant improvement",
  "ti allowance",
  "investor",
  "investment",
  "medical practice",
  "dental practice",
  "law firm",
  "attorney",
  "financial advisor",
  "architect",
  "engineer",
  "multiple units",
  "several offices",
  "urgent",
  "time sensitive",
  "closing soon",
];

/**
 * Detect whale signals from any free-text string (additionalInfo, chatbot transcript, etc.)
 * Case-insensitive, full-phrase matching.
 */
export function detectWhale(text: string): WhaleResult {
  if (!text || text.trim().length < 5) {
    return { isWhale: false, whaleTier: null, whaleKeywords: [] };
  }

  const lower = text.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check high-intent terms (single = gold)
  const highMatches = HIGH_INTENT_TERMS.filter((term) => lower.includes(term));
  matchedKeywords.push(...highMatches);

  // Check medium-intent terms
  const mediumMatches = MEDIUM_INTENT_TERMS.filter((term) => lower.includes(term));
  matchedKeywords.push(...mediumMatches);

  // Tier logic
  if (highMatches.length >= 1 || mediumMatches.length >= 2) {
    return { isWhale: true, whaleTier: "gold", whaleKeywords: matchedKeywords };
  }
  if (mediumMatches.length === 1) {
    return { isWhale: true, whaleTier: "silver", whaleKeywords: matchedKeywords };
  }

  return { isWhale: false, whaleTier: null, whaleKeywords: [] };
}
