import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET() {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    // 1. Fetch leads
    const leadsRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, { headers: H });
    const leads = leadsRes.ok ? await leadsRes.json() : [];

    // 2. Fetch tenants
    const tenantsRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, { headers: H });
    const tenants = tenantsRes.ok ? await tenantsRes.json() : [];

    // 3. Fetch maintenance tickets
    const maintRes = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets`, { headers: H });
    const tickets = maintRes.ok ? await maintRes.json() : [];

    // 4. Fetch cleaning assignments
    const cleaningRes = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments`, { headers: H });
    const cleanings = cleaningRes.ok ? await cleaningRes.json() : [];

    // 5. Fetch activity logs
    const activityRes = await fetch(`${SUPABASE_URL}/rest/v1/activity_log?limit=100&order=created_at.desc`, { headers: H });
    const logs = activityRes.ok ? await activityRes.json() : [];

    // Perform aggregations
    const totalLeads = leads.length;
    const activeLeads = leads.filter((l: any) => !l.archived_at);
    
    // Total tenants count
    const totalTenants = tenants.length;
    
    // Conversion rate
    const conversionRate = totalLeads > 0 ? Math.round((totalTenants / totalLeads) * 100) : 0;
    
    // Pipeline Value
    const pipelineValue = activeLeads.reduce((s: number, l: any) => s + (Number(l.budget) || 0), 0);

    // Maintenance ticket metrics
    const totalTickets = tickets.length;
    const completedTickets = tickets.filter((t: any) => t.status === "complete");
    const maintEstCost = tickets.reduce((s: number, t: any) => s + (Number(t.estimated_cost) || 0), 0);
    const maintActCost = tickets.reduce((s: number, t: any) => s + (Number(t.actual_cost) || 0), 0);

    // SLA calculations
    const checkIsBreached = (t: any) => {
      const priority = Number(t.priority);
      if (priority === 4) return false;
      const created = new Date(t.created_at).getTime();
      const limit = priority === 1 ? 2 * 3600000 // 2 hours
                  : priority === 2 ? 24 * 3600000 // 24 hours
                  : 7 * 24 * 3600000; // 7 days
      
      if (t.first_response_at) {
        const resp = new Date(t.first_response_at).getTime();
        return (resp - created) > limit;
      }
      if (t.status === "open") {
        return (Date.now() - created) > limit;
      }
      return false;
    };

    const slaEligible = tickets.filter((t: any) => Number(t.priority) <= 3);
    const slaBreached = slaEligible.filter(checkIsBreached);
    const slaCompliantCount = slaEligible.length - slaBreached.length;
    const slaCompliancePct = slaEligible.length > 0
      ? Math.round((slaCompliantCount / slaEligible.length) * 100)
      : 100;

    const respondedTickets = tickets.filter((t: any) => t.first_response_at);
    const avgResponseTimeMin = respondedTickets.length > 0 
      ? respondedTickets.reduce((acc: number, t: any) => {
          const diff = new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime();
          return acc + diff;
        }, 0) / (respondedTickets.length * 60000)
      : 0;
    
    const avgResponseTime = avgResponseTimeMin > 60
      ? `${Math.round(avgResponseTimeMin / 60)}h ${Math.round(avgResponseTimeMin % 60)}m`
      : avgResponseTimeMin > 0
      ? `${Math.round(avgResponseTimeMin)}m`
      : "—";

    // Cleaning metrics
    const totalCleaning = cleanings.length;
    const completedCleaning = cleanings.filter((c: any) => c.status === "done").length;
    const cleaningEstCost = cleanings.reduce((s: number, c: any) => s + (Number(c.estimated_cost) || 0), 0);
    const cleaningActCost = cleanings.reduce((s: number, c: any) => s + (Number(c.actual_cost) || 0), 0);

    const activityCount = logs.length;

    // Call Gemini
    const systemPrompt = `
You are an elite commercial real estate operations analyst. Analyze the following performance data for the properties under management this quarter and generate a premium, executive-level Quarterly Business Review (QBR) summary.

Data Summary:
- Leads:
  * Total Leads Created: ${totalLeads}
  * Active Leads: ${activeLeads.length}
  * Conversion Rate (Total Tenants / Total Leads): ${conversionRate}%
  * Total Pipeline Revenue Opportunity (Sum of Active Lead Budgets): $${pipelineValue.toLocaleString()}
- Maintenance Tickets:
  * Total Work Orders: ${totalTickets}
  * Completed: ${completedTickets.length}
  * SLA Compliance Rate: ${slaCompliancePct}%
  * Average Response Time: ${avgResponseTime}
  * Maintenance Budget Utilization: Estimated Cost $${maintEstCost.toLocaleString()} vs Actual Cost $${maintActCost.toLocaleString()}
- Cleaning Assignments:
  * Total Scheduled Tasks: ${totalCleaning}
  * Completed Tasks: ${completedCleaning}
  * Cleaning Cost Utilization: Estimated Cost $${cleaningEstCost.toLocaleString()} vs Actual Cost $${cleaningActCost.toLocaleString()}
- System Activity Log: ${activityCount} operational logs recorded this period.

Format your response strictly as a JSON object with the following fields:
{
  "executiveSummary": "A high-level paragraph summarizing the quarter's operational efficiency, financial performance, and lead flow status.",
  "achievements": [
    { "title": "Achievement name", "description": "Brief description of a major operational success backed by the data." },
    { "title": "Achievement name", "description": "Brief description of another operational success." }
  ],
  "operationalWeaknesses": [
    { "title": "Area of concern", "description": "Brief description of where SLA response times, cost overruns, or pipeline conversions missed targets." },
    { "title": "Area of concern", "description": "Another area that requires management focus." }
  ],
  "financialAnalysis": "A brief analysis comparing estimated vs. actual expenses across maintenance and cleaning, explaining budget utilization and pipeline health.",
  "actionPlan": [
    { "step": "Actionable directive", "timeframe": "Timeframe (e.g. Weeks 1-4)", "details": "Specific steps staff must take to resolve issues." },
    { "step": "Actionable directive", "timeframe": "Timeframe", "details": "Specific steps staff must take." }
  ]
}

Ensure the output is valid JSON. Do not return any markdown code blocks or text outside the JSON block. Return ONLY the JSON object.
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini QBR error:", errText);
      return NextResponse.json({ error: `Gemini failed: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const rawText = parts
      .filter((p: any) => !p.thought)
      .map((p: any) => p.text || "")
      .join("")
      .trim();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid JSON from AI", rawText }, { status: 500 });
    }

    const report = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      metrics: {
        totalLeads,
        activeLeadsCount: activeLeads.length,
        conversionRate,
        pipelineValue,
        totalTickets,
        completedTicketsCount: completedTickets.length,
        slaCompliancePct,
        avgResponseTime,
        maintEstCost,
        maintActCost,
        totalCleaning,
        completedCleaningCount: completedCleaning,
        cleaningEstCost,
        cleaningActCost,
        activityCount,
      },
      report,
    });
  } catch (error: any) {
    console.error("QBR generation failed:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
