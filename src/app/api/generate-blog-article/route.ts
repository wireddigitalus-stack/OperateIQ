import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const MODEL      = "gemini-1.6-flash";
const ENDPOINT   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

export async function POST(req: NextRequest) {
  const { topic, keyword, category, property } = await req.json();

  if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });

  const prompt = `You are an expert commercial real estate content writer for Vision LLC — the largest private CRE owner in Downtown Bristol, TN/VA.

Write a complete, publication-ready SEO blog article with the following specs:
- Topic: ${topic}
- Target keyword: ${keyword || topic}
- Category: ${category || "Market Insights"}
${property ? `- Feature property: ${property}` : ""}

OUTPUT FORMAT (return valid JSON only, no markdown wrapper):
{
  "title": "Article headline (55-65 chars, includes keyword)",
  "metaTitle": "SEO title tag (55-60 chars max)",
  "metaDescription": "SEO meta description (145-155 chars, includes keyword, ends with CTA)",
  "excerpt": "2-sentence article summary for blog cards",
  "tags": ["Tag1","Tag2","Tag3","Tag4"],
  "readTime": 6,
  "content": "Full article in HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. 1,200-1,600 words. Include: intro hook, 3-4 main sections with H2 headings, local Bristol TN/VA and Tri-Cities references, data points where relevant, and a closing CTA paragraph mentioning Vision LLC and phone 423-573-1022."
}

Rules:
- The content MUST mention Downtown Bristol, TN/VA and Vision LLC naturally
- Include the target keyword in the first paragraph
- Write at a professional B2B level — no fluff, real insights
- Return ONLY the JSON, no other text`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const raw   = parts.map((p: { text?: string }) => p.text ?? "").join("").trim();

    // Strip markdown code fences if present
    const json  = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(json);

    return NextResponse.json({ success: true, article: parsed });
  } catch (err) {
    console.error("Blog gen error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
