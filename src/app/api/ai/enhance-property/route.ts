import { NextRequest, NextResponse } from "next/server";
import { getOrgProfile } from "@/lib/org-profile";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json(
      { error: "GEMINI_KEY_MISSING", message: "Add GEMINI_API_KEY to your environment variables to use AI enhancement." },
      { status: 422 }
    );
  }

  const { name, type, city, sqft, address, keywords } = await req.json();
  if (!name || !type || !city) {
    return NextResponse.json({ error: "name, type, and city are required" }, { status: 400 });
  }

  const org = getOrgProfile();

  const prompt = `You are an expert commercial real estate copywriter for ${org.name}, a commercial real estate firm in ${org.location}.

Generate compelling property listing content for the following property:

- Name: ${name}
- Type: ${type}
- City: ${city}
- Size: ${sqft ? sqft + " sq ft" : "size TBD"}
- Address: ${address || `${city} area`}
- Keywords/Features: ${keywords || "professional, quality, well-maintained"}

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "description": "2–3 paragraph professional property description (200–300 words). Mention the local ${city} market, the property's strengths, and ideal tenant types.",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5", "Feature 6"],
  "badge": "Short catchy badge text (2–3 words max, e.g. Move-In Ready, Prime Location, High Traffic)",
  "metaDescription": "SEO meta description under 160 characters mentioning the city and property type"
}`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("AI enhance error:", e);
    return NextResponse.json({ error: "AI generation failed. Fill in the fields manually." }, { status: 500 });
  }
}
