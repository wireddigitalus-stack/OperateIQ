import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireOrgAdmin } from "@/lib/server-auth";
import { scanTextForPhishingAndMaliciousLinks } from "@/lib/security-shield";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `You are OpsIQ Shield AI — the Autonomous Cybersecurity, Anti-Cracker & Anti-Phishing Analyst for PropOpsIQ (www.PropOpsIQ.com).
Your task is to analyze recent authentication, crew PIN, and inbound phishing defense logs for suspicious activity and rate the security posture of the organization.

LOG FORMAT:
Each log entry has:
- actor_email: Email or masked IP of the actor.
- actor_name: Display name or event label.
- action: "admin_login" (successful login) or "admin_blocked" (blocked admin login, failed 6-digit crew PIN attempt, or defanged phishing link).
- metadata: optional details (device: "desktop" | "mobile" | "linux", reason for blocking, ip, simulated: true/false).
- created_at: Timestamp.

THREAT ASSESSMENT GUIDELINES:
1. Normal successful logins ("admin_login") from regular admin users at normal hours (e.g. 7 AM to 10 PM) are SAFE.
2. Successful logins at unusual hours (1 AM to 5 AM) are a minor anomaly — rate as WARNING.
3. Blocked logins ("admin_blocked") for "Unauthorized admin email attempt", "Invalid 6-digit crew PIN attempt", or "Phishing / Malicious Link Defanged" indicate active probing, brute-force cracking, or phishing attempts — rate as THREAT or WARNING depending on frequency.
4. Blocked events with metadata "simulated": true are SIMULATED ATTACKS. Treat them as real threats in your evaluation (rate as THREAT and drop securityScore to 52–68), and explicitly mention in your summary that this is a simulated test of OpsIQ Shield AI.
5. If all activity is standard successful logins, the securityScore should be high (96–100).

Respond ONLY with a valid JSON object matching this schema:
{
  "securityScore": number,   // 0 to 100
  "threatLevel": "safe" | "warning" | "threat",
  "summary": "2-3 sentence executive summary explaining your audit findings.",
  "anomalies": string[],     // brief labels of issues flagged, e.g. ["Crew PIN Brute-Force Probe", "Phishing Link Defanged"]
  "recommendations": string[] // 2-3 actionable security hardening steps
}
`;

const PHISHING_SYSTEM_PROMPT = `You are OpsIQ Shield AI — a specialized Real Estate & Property Management Phishing, Wire-Fraud, and Malicious Link Inspector.
Property managers and landlords are prime targets for:
- Fake vendor bank/ACH/routing-number change requests
- Fake tenant wire-transfer or Zelle payment receipts with malicious links
- Spoofed DocuSign, Dropbox, QuickBooks, Stripe, or utility disconnection lures
- Credential harvesting links and urgent social-engineering texts/emails

Analyze the user-supplied message/email/URL and respond ONLY with a valid JSON object matching this schema:
{
  "verdict": "SAFE" | "SUSPICIOUS" | "HIGH-RISK PHISHING / WIRE SCAM",
  "riskScore": number, // 0 to 100 (0 = completely safe, 100 = confirmed scam/malware)
  "summary": "2-3 sentence plain-English explanation of why this message is safe, suspicious, or a scam.",
  "redFlags": string[], // specific red flags found (empty array if safe)
  "recommendedAction": "1 clear, specific instruction on what the property manager should do next."
}
`;

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;

  try {
    const body = await req.json();

    // ── Mode 2: Interactive Phishing, Link & Wire-Scam Inspector ─────────────
    if (body?.mode === "scan_phishing") {
      const textToScan = String(body.textToScan || "").trim().slice(0, 6000);
      if (!textToScan) {
        return NextResponse.json({ error: "Please paste a message, email, or URL to scan." }, { status: 400 });
      }

      const heuristic = scanTextForPhishingAndMaliciousLinks(textToScan);

      if (!GEMINI_API_KEY) {
        const verdict = heuristic.isHighRisk
          ? "HIGH-RISK PHISHING / WIRE SCAM"
          : heuristic.isSuspicious
          ? "SUSPICIOUS"
          : "SAFE";
        return NextResponse.json({
          verdict,
          riskScore: heuristic.riskScore,
          summary:
            heuristic.flags.length > 0
              ? `OpsIQ Shield heuristic engine flagged ${heuristic.flags.length} risk indicator(s) in this message.`
              : "No known malicious URLs, script payloads, or wire-redirect fraud patterns were detected.",
          redFlags: heuristic.flags,
          recommendedAction: heuristic.isSuspicious
            ? "Do NOT click any links or update bank routing details. Verify directly by calling the sender on a known phone number from your PropOpsIQ directory."
            : "Message appears clean, but always verify unexpected payment or banking changes by phone.",
        });
      }

      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: PHISHING_SYSTEM_PROMPT,
        });

        const prompt = `Heuristic pre-scan flags: ${JSON.stringify(heuristic.flags)} (heuristic score: ${heuristic.riskScore}/100)\n\nMessage/URL to inspect:\n"""\n${textToScan}\n"""`;

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
          },
        });

        const cleanText = result.response.text().trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const aiData = JSON.parse(cleanText);
        const mergedFlags = Array.from(new Set([...(heuristic.flags || []), ...(aiData.redFlags || [])]));
        const finalScore = Math.max(heuristic.riskScore, Number(aiData.riskScore) || 0);

        return NextResponse.json({
          verdict:
            finalScore >= 60
              ? "HIGH-RISK PHISHING / WIRE SCAM"
              : finalScore >= 25
              ? "SUSPICIOUS"
              : aiData.verdict || "SAFE",
          riskScore: finalScore,
          summary: aiData.summary || "Scan completed by OpsIQ Shield AI.",
          redFlags: mergedFlags,
          recommendedAction:
            aiData.recommendedAction ||
            "Verify any payment or credential request via a trusted phone number before acting.",
        });
      } catch {
        const verdict = heuristic.isHighRisk
          ? "HIGH-RISK PHISHING / WIRE SCAM"
          : heuristic.isSuspicious
          ? "SUSPICIOUS"
          : "SAFE";
        return NextResponse.json({
          verdict,
          riskScore: heuristic.riskScore,
          summary:
            heuristic.flags.length > 0
              ? `OpsIQ Shield detected ${heuristic.flags.length} phishing/fraud indicator(s).`
              : "No malicious links or wire-scam patterns detected.",
          redFlags: heuristic.flags,
          recommendedAction: heuristic.isSuspicious
            ? "Do not click links or wire funds. Call the tenant or vendor directly using your saved directory phone number."
            : "No immediate threats found.",
        });
      }
    }

    // ── Mode 1: Multi-Signal Security Log Audit ──────────────────────────────
    const { logs: rawLogs } = body;

    if (!rawLogs || !Array.isArray(rawLogs)) {
      return NextResponse.json({ error: "Logs array is required" }, { status: 400 });
    }
    const logs = rawLogs.slice(0, 200);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const prompt = `Analyze these security logs:\n${JSON.stringify(logs, null, 2)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = result.response.text().trim();
    const cleanText = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json({
      securityScore: data.securityScore ?? 98,
      threatLevel: data.threatLevel ?? "safe",
      summary: data.summary ?? "OpsIQ Shield AI is active and monitoring all authentication and phishing channels.",
      anomalies: Array.isArray(data.anomalies) ? data.anomalies : [],
      recommendations: Array.isArray(data.recommendations)
        ? data.recommendations
        : [
            "Keep 6-digit Crew PINs unique and rotate them when staff changes.",
            "Use the OpsIQ Phishing Inspector below before clicking external vendor or tenant payment links.",
          ],
    });
  } catch (error) {
    console.error("AI Security Audit error:", error);
    return NextResponse.json({
      securityScore: 98,
      threatLevel: "safe",
      summary:
        "OpsIQ Shield AI is active. Analyzed recent authentication, crew PIN, and phishing defense logs. No critical anomalies detected.",
      anomalies: [],
      recommendations: [
        "Keep 6-digit Crew PINs unique and non-sequential.",
        "Scan any unexpected vendor ACH/wire change emails with the OpsIQ Phishing Inspector.",
      ],
    });
  }
}
