// ─────────────────────────────────────────────────────────────────────────────
// OpsIQ Shield — Anti-Hacker, Anti-Cracker & Anti-Phisher Security Utilities
// ─────────────────────────────────────────────────────────────────────────────

const WEAK_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444",
  "555555", "666666", "777777", "888888", "999999",
  "123456", "654321", "123123", "112233", "121212",
  "101010", "012345", "543210", "000001", "999990",
  "135790", "246810", "111222", "789456", "456789",
]);

/**
 * Returns true if a 6-digit PIN is trivially guessable by brute-force crackers
 * (all identical digits, sequential runs, simple repeats, or top leaked PINs).
 */
export function isWeakPin(pin: string): boolean {
  const clean = (pin || "").trim();
  if (!/^\d{6}$/.test(clean)) return true;
  if (WEAK_PINS.has(clean)) return true;

  // All 6 digits identical (e.g. 777777)
  if (/^(\d)\1{5}$/.test(clean)) return true;

  // Repeating 2-digit or 3-digit pattern (e.g. 454545, 789789)
  if (/^(\d\d)\1\1$/.test(clean) || /^(\d\d\d)\1$/.test(clean)) return true;

  // Strictly ascending or descending sequence (e.g. 234567, 876543)
  let asc = true;
  let desc = true;
  for (let i = 1; i < clean.length; i++) {
    const prev = clean.charCodeAt(i - 1) - 48;
    const curr = clean.charCodeAt(i) - 48;
    if (curr !== prev + 1) asc = false;
    if (curr !== prev - 1) desc = false;
  }
  if (asc || desc) return true;

  return false;
}

/**
 * Generates a high-entropy 6-digit PIN guaranteed not to match weak/sequential patterns.
 */
export function generateStrongPin(): string {
  for (let attempt = 0; attempt < 25; attempt++) {
    let candidate = "";
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      candidate = String(100000 + (buf[0] % 900000));
    } else {
      candidate = String(Math.floor(100000 + Math.random() * 900000));
    }
    if (!isWeakPin(candidate)) return candidate;
  }
  return "482917";
}

/**
 * Masks an IP address for privacy-compliant security logging (e.g. 203.0.113.42 -> 203.0.113.xxx).
 */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  const clean = ip.trim();
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  if (clean.includes(":")) {
    const parts = clean.split(":");
    return `${parts.slice(0, 3).join(":")}:xxxx`;
  }
  return clean;
}

export interface PhishingScanResult {
  isSuspicious: boolean;
  isHighRisk: boolean;
  riskScore: number; // 0 to 100
  flags: string[];
  sanitizedText: string;
}

/**
 * Deterministic heuristic scanner for inbound messages, emails, and URLs.
 * Detects phishing links, credential harvesting tricks, XSS payloads, and wire/ACH redirect fraud.
 */
export function scanTextForPhishingAndMaliciousLinks(rawText: string): PhishingScanResult {
  const text = String(rawText || "");
  const flags: string[] = [];
  let riskScore = 0;

  // 1. Script / XSS / Dangerous URI schemes
  if (/<\s*script\b|javascript:|data:text\/html|vbscript:|onerror\s*=|onload\s*=/i.test(text)) {
    flags.push("Embedded script or executable URI payload detected");
    riskScore += 65;
  }

  // 2. Credential-embedded URLs (e.g. https://login.microsoft.com@evil.com)
  if (/https?:\/\/[^\s/]+@[^\s/]+/i.test(text)) {
    flags.push("Deceptive URL with embedded '@' redirect trick");
    riskScore += 55;
  }

  // 3. Raw IP address URLs (e.g. http://185.220.101.4/login)
  if (/https?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i.test(text)) {
    flags.push("Raw IP address link (common in malware/phishing hosts)");
    riskScore += 50;
  }

  // 4. High-risk file download links (.exe, .scr, .bat, .cmd, .msi, .apk, .iso)
  if (/https?:\/\/[^\s]+\.(?:exe|scr|bat|cmd|msi|vbs|ps1|iso|dmg|apk)(?:\?[^\s]*)?\b/i.test(text)) {
    flags.push("Direct link to executable or disk-image file");
    riskScore += 60;
  }

  // 5. Suspicious URL shorteners or punycode homograph domains (xn--)
  if (/https?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|rb\.gy|is\.gd|shorturl\.at|cutt\.ly)\//i.test(text)) {
    flags.push("Obfuscated shortened URL hiding destination domain");
    riskScore += 25;
  }
  if (/https?:\/\/[^\s]*xn--/i.test(text)) {
    flags.push("Internationalized punycode (xn--) lookalike domain");
    riskScore += 45;
  }

  // 6. Real-estate / Property Management Wire, ACH & Zelle Redirect Fraud patterns
  if (
    /\b(?:new\s+wire\s+instructions|updated\s+routing\s+number|change\s+of\s+bank\s+account|wire\s+transfer\s+immediately|urgent\s+ach\s+update|send\s+gift\s+cards|bitcoin|crypto\s+wallet|verify\s+your\s+password\s+immediately|account\s+will\s+be\s+suspended)\b/i.test(
      text
    )
  ) {
    flags.push("Wire-transfer / banking-redirect or credential-urgency language");
    riskScore += 45;
  }

  // 7. Spoofed brand login lures
  if (
    /\b(?:docusign|dropbox|quickbooks|stripe|chase|wells\s*fargo|bank\s*of\s*america)\b/i.test(text) &&
    /https?:\/\/(?![^\s/]*(?:docusign\.com|docusign\.net|dropbox\.com|intuit\.com|stripe\.com|chase\.com|wellsfargo\.com|bankofamerica\.com|propopsiq\.com))/i.test(
      text
    )
  ) {
    flags.push("Brand name mentioned alongside a non-matching external link");
    riskScore += 40;
  }

  riskScore = Math.min(100, riskScore);
  const isHighRisk = riskScore >= 50;
  const isSuspicious = riskScore >= 25;

  // Defang dangerous script tags and high-risk links so admins can't accidentally click them
  let sanitizedText = text
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "[REMOVED SCRIPT]")
    .replace(/javascript:/gi, "blocked-js:");

  if (isHighRisk) {
    sanitizedText = sanitizedText.replace(/https?:\/\/[^\s)]+/gi, (match) => {
      return `[⚠️ BLOCKED SUSPICIOUS LINK: ${match.replace(/^https?:\/\//i, "hxxps://").slice(0, 60)}]`;
    });
  }

  return {
    isSuspicious,
    isHighRisk,
    riskScore,
    flags,
    sanitizedText,
  };
}
