// In-memory lead store for demo purposes
// In production: replace with a real DB or Monday.com API

export interface MatchedProperty {
  id: string;
  name: string;
  type: string;
  sqft: string;
  location: string;
  matchReason: string;
}

export interface Lead {
  id: string;
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  spaceType: string;
  budget: number;
  timeline: string;
  teamSize: string;
  additionalInfo: string;
  score: number;
  scoreLabel: "Verified Lead" | "MQL" | "Prospect Lead" | "Potential Spam";
  reasoning: string;
  matchedProperties: MatchedProperty[];
  // Whale Alert fields
  isWhale?: boolean;
  whaleTier?: "gold" | "silver" | null;
  whaleKeywords?: string[];
  // UTM source attribution
  source?: string;    // e.g. "facebook", "instagram", "google", "organic"
  medium?: string;    // e.g. "social", "cpc", "email"
  campaign?: string;  // e.g. "spring-office-push"
  // Manual archive
  archivedAt?: string | null;
  // Follow-up & Creator fields
  followUpDate?: string | null;
  createdByEmployee?: string;
  progress?: string;
}



// Module-level singleton — persists across requests in the same server process
export const LEADS_STORE: Lead[] = [];
