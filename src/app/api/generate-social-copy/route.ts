import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    const { property, tone, customContext, goal } = await req.json();
    if (!property?.name) {
      return NextResponse.json({ error: "Property is required." }, { status: 400 });
    }

    const toneGuide: Record<string, string> = {
      professional: "formal and polished, ideal for business owners and executives",
      friendly:     "warm and approachable, welcoming to small business owners and entrepreneurs",
      exciting:     "energetic and enthusiastic with urgency — limited opportunity, act now!",
      luxury:       "aspirational and premium — speak to success, prestige, and exclusivity",
    };

    const goalGuide: Record<string, string> = {
      awareness:  "Build brand awareness. Focus on Vision LLC reputation, location prestige, and the Bristol market story.",
      leads:      "Drive direct inquiries. Include phone 423-573-1022 and teamvisionllc.com. Push the reader to contact us today.",
      tour:       "Schedule a property tour. Create urgency and excitement. Make them want to physically see the space.",
      promo:      "Highlight a specific promotion or deal. Make the value proposition crystal clear and time-sensitive.",
    };

    const contextNote = customContext?.trim()
      ? `\nSpecial angle / hook to highlight: ${customContext.trim()}`
      : "";

    const goalNote = goal && goalGuide[goal]
      ? `\nContent Goal: ${goalGuide[goal]}`
      : "";

    const prompt = `You are a top-tier social media strategist for Vision LLC, Downtown Bristol TN/VA's premier commercial real estate firm (20+ years, largest private CRE owner downtown).

PROPERTY: ${property.name}
TYPE: ${property.type}
LOCATION: ${property.city ?? "Bristol, TN/VA"}
SIZE: ${property.sqft} sqft
STATUS: ${property.status}
DESCRIPTION: ${property.description ?? ""}
FEATURES: ${(property.features ?? []).join(", ") || "N/A"}
TONE: ${toneGuide[tone] ?? toneGuide.professional}${contextNote}${goalNote}

Generate ALL sections below. IMPORTANT: Use EXACTLY these section headers on their own line. Write the content on the very next line — no blank lines between header and content. Do NOT truncate or cut off any section.

POST:
Write a single universal social media post (3-5 sentences). This will be used across Facebook, Instagram, and LinkedIn. Include a strong hook first sentence, 2-3 key property details, and end with a CTA including phone 423-573-1022 or teamvisionllc.com. Max 2 emojis. Do not include hashtags here.

POST_ALT:
An alternative version of the post with a different angle or hook. Same length and format rules as POST.

STORY:
Max 10 words. Ultra-punchy overlay text for Instagram/Facebook Stories. Example: "Prime downtown office — available now 🏢"

EMAIL_SUBJECT:
One punchy email subject line. Max 60 chars. No emojis. High open-rate style.

GOOGLE_POST:
Google Business profile post. 1-2 sentences. Local focus. Include phone 423-573-1022. Max 1500 chars.

HASHTAGS_LOCATION:
Exactly 8 hashtags for Bristol TN/VA location and Tri-Cities area. All on one line, space separated. No line breaks.

HASHTAGS_INDUSTRY:
Exactly 8 hashtags for commercial real estate industry. All on one line, space separated. Must include #CommercialRealEstate #CRE #VisionLLC. No line breaks.

HASHTAGS_PROPERTY:
Exactly 8 hashtags specific to this property type, features, and local market. All on one line, space separated. No line breaks.

BEST_TIME:
One sentence: best day + time to post for CRE content in Eastern US, with brief reason. Apply to all platforms.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: `Gemini API error ${geminiRes.status}` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p.text || "").join("").trim();

    if (!text) {
      return NextResponse.json({ error: "No content generated. Please try again." }, { status: 500 });
    }

    const LABELS = [
      "POST", "POST_ALT", "STORY", "EMAIL_SUBJECT", "GOOGLE_POST",
      "HASHTAGS_LOCATION", "HASHTAGS_INDUSTRY", "HASHTAGS_PROPERTY", "BEST_TIME",
    ];

    const extract = (label: string) => {
      const pattern = new RegExp(
        `${label}:\\s*([\\s\\S]*?)(?=${LABELS.filter(l => l !== label).map(l => `${l}:`).join("|")}|$)`,
        "i"
      );
      return text.match(pattern)?.[1]?.trim() ?? "";
    };

    const hashtagsLocation = extract("HASHTAGS_LOCATION");
    const hashtagsIndustry = extract("HASHTAGS_INDUSTRY");
    const hashtagsProperty = extract("HASHTAGS_PROPERTY");

    const allHashtags = [hashtagsLocation, hashtagsIndustry, hashtagsProperty]
      .join(" ")
      .split(/\s+/)
      .filter(h => h.startsWith("#"))
      .filter((h, i, arr) => arr.indexOf(h) === i)
      .join(" ");

    return NextResponse.json({
      post:             extract("POST"),
      postAlt:          extract("POST_ALT"),
      storyCaption:     extract("STORY"),
      emailSubject:     extract("EMAIL_SUBJECT"),
      googlePost:       extract("GOOGLE_POST"),
      hashtagsLocation,
      hashtagsIndustry,
      hashtagsProperty,
      hashtags:         allHashtags,
      bestTime:         extract("BEST_TIME"),
    });
  } catch (err) {
    console.error("Social copy generation error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
