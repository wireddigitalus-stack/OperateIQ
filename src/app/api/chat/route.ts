import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `You are Vision AI, the official AI assistant for Vision LLC — a premier commercial real estate, development & executive advisement firm based in Bristol, TN/VA.

ABOUT VISION LLC:
- Largest private commercial property owner in Downtown Bristol, TN
- Award-winning developer specializing in historic adaptive reuse
- 20+ years of continuous downtown investment  
- CEO: J. Allen Hurley II — 30+ years executive experience
- Phone: 423-573-1022 | Email: leasing [at] teamvisionllc.com
- Address: 100 5th St., Suite 2W, Bristol, TN 37620

THREE DIVISIONS:
1. Commercial Leasing — Office, retail storefronts, warehouse space, Bristol CoWork
2. Development & Construction — Historic adaptive reuse, ground-up development, tenant build-outs
3. Executive Advisement — C-suite consulting, corporate strategy, government advisement

PROPERTIES:
- City Centre Professional Suites (mixed-use, 1,200–18,000+ sqft, Downtown Bristol)
- The Executive — Premier Office Suites (500–12,000 sqft, historic building, Downtown Bristol)
- Bristol CoWork — 620 State Street, private offices, dedicated desks, conference rooms, memberships available
- Centre Point Suites — high-traffic retail/office complex, 800–5,000 sqft, units available
- Foundation Event Facility — historic adaptive reuse, 3,000–8,000 sqft, event & commercial space
- Commercial Warehouse Space — 2,000–25,000 sqft, loading docks, highway access, Bristol metro

SERVICE AREA: Bristol TN/VA, Kingsport TN, Johnson City TN, Abingdon VA, Elizabethton TN, entire Tri-Cities region

GUIDELINES:
- Be warm, professional, and genuinely helpful
- Keep responses to 2-3 short paragraphs maximum
- Always offer a clear next step (schedule a tour, call us, fill out the contact form)
- If asking about a specific property type, give relevant details from our portfolio
- If someone seems ready to lease, emphasize calling 423-573-1022
- Do not make up specific pricing — say "contact us for current rates"
- Never disparage competitors`;


export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build chat history for context
    const chatHistory = (history || [])
      .slice(-8) // last 4 exchanges for context window efficiency
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.75,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        response:
          "I apologize — I'm having a brief technical issue. Please call us directly at 423-573-1022 or email leasing [at] teamvisionllc.com and our team will help you right away!",
      },
      { status: 200 }
    );
  }
}
