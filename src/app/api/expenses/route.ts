import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg } from "@/lib/server-auth";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

export interface ExpenseRecord {
  id: string;
  building: string;
  unit: string;
  expenseDate: string; // YYYY-MM-DD
  category: string;    // IRS Schedule E line key
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: string;
  taxDeductible: boolean;
  receiptUrl: string;
  receiptName: string;
  sourceTicketId: string | null;
  createdBy: string;
  createdAt: string;
}

const VALID_CATEGORIES = new Set([
  "advertising",
  "auto_travel",
  "cleaning_maintenance",
  "commissions",
  "insurance",
  "legal_professional",
  "management_fees",
  "mortgage_interest",
  "other_interest",
  "repairs",
  "supplies",
  "taxes",
  "utilities",
  "other",
]);

function normalizeCategory(raw: unknown): string {
  const v = String(raw || "repairs").toLowerCase().trim();
  return VALID_CATEGORIES.has(v) ? v : "other";
}

function rowToExpense(r: Record<string, unknown>): ExpenseRecord {
  return {
    id: String(r.id || ""),
    building: String(r.building || "Portfolio / General"),
    unit: String(r.unit || ""),
    expenseDate: String(r.expense_date ?? r.expenseDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    category: normalizeCategory(r.category),
    vendor: String(r.vendor || ""),
    description: String(r.description || ""),
    amount: Math.round((Number(r.amount) || 0) * 100) / 100,
    paymentMethod: String(r.payment_method ?? r.paymentMethod ?? ""),
    taxDeductible: r.tax_deductible !== undefined ? Boolean(r.tax_deductible) : r.taxDeductible !== undefined ? Boolean(r.taxDeductible) : true,
    receiptUrl: String(r.receipt_url ?? r.receiptUrl ?? ""),
    receiptName: String(r.receipt_name ?? r.receiptName ?? ""),
    sourceTicketId: r.source_ticket_id
      ? String(r.source_ticket_id)
      : r.sourceTicketId
      ? String(r.sourceTicketId)
      : null,
    createdBy: String(r.created_by ?? r.createdBy ?? ""),
    createdAt: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
  };
}

function isMissingTable(status: number, bodyText: string): boolean {
  return (
    status === 404 ||
    bodyText.includes("PGRST205") ||
    bodyText.includes("42P01") ||
    bodyText.includes("Could not find the table")
  );
}

async function loadFallbackExpenses(orgId: string, year: number): Promise<ExpenseRecord[]> {
  const key = `items_${year}`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.expenses_ledger&key=eq.${key}&select=value`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  const raw = rows?.[0]?.value;
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map((item) => rowToExpense(item as Record<string, unknown>)) : [];
  } catch {
    return [];
  }
}

async function saveFallbackExpenses(orgId: string, year: number, items: ExpenseRecord[]): Promise<void> {
  const key = `items_${year}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      org_id: orgId,
      section: "expenses_ledger",
      key,
      value: JSON.stringify(items),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fallback expenses save failed (${res.status}): ${errText}`);
  }
}

async function readYearExpenses(
  orgId: string,
  year: number
): Promise<{ mode: "table" | "fallback"; expenses: ExpenseRecord[] }> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/expenses?org_id=eq.${orgId}&expense_date=gte.${startDate}&expense_date=lte.${endDate}&order=expense_date.desc,created_at.desc&limit=1000`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) {
    const errText = await res.text();
    if (isMissingTable(res.status, errText)) {
      const expenses = await loadFallbackExpenses(orgId, year);
      return {
        mode: "fallback",
        expenses: expenses.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)),
      };
    }
    throw new Error(`expenses GET (${res.status}): ${errText}`);
  }
  const rows = await res.json();
  return {
    mode: "table",
    expenses: Array.isArray(rows) ? rows.map((r) => rowToExpense(r as Record<string, unknown>)) : [],
  };
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const yearParam = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const year = Math.max(2020, Math.min(2100, yearParam));

  try {
    const [{ mode, expenses }, rentRes, propsRes] = await Promise.all([
      readYearExpenses(orgId, year),
      fetch(
        `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=like.${year}-*&select=building,amount_paid,paid`,
        { headers, cache: "no-store" }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&select=id,name&order=name.asc`,
        { headers, cache: "no-store" }
      ),
    ]);

    let totalRentCollected = 0;
    const rentCollectedByBuilding: Record<string, number> = {};
    if (rentRes.ok) {
      const rentRows: Array<Record<string, unknown>> = await rentRes.json();
      for (const r of Array.isArray(rentRows) ? rentRows : []) {
        const amt = Number(r.amount_paid) || 0;
        if (amt <= 0) continue;
        totalRentCollected += amt;
        const b = String(r.building || "Unassigned").trim() || "Unassigned";
        rentCollectedByBuilding[b] = Math.round(((rentCollectedByBuilding[b] || 0) + amt) * 100) / 100;
      }
    }
    totalRentCollected = Math.round(totalRentCollected * 100) / 100;

    const properties = propsRes.ok ? await propsRes.json() : [];

    return NextResponse.json({
      year,
      expenses,
      totalRentCollected,
      rentCollectedByBuilding,
      properties: Array.isArray(properties) ? properties : [],
      storageMode: mode,
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load expense ledger.", { route: "/api/expenses", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const email = user?.email || "admin";
  const name = user?.name || "Owner";

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  try {
    // ── Action: 1-Click Import Completed Maintenance Ticket Costs ─────────
    if (body.action === "import_maintenance_costs") {
      const year = Math.max(2020, Math.min(2100, Number(body.year) || new Date().getFullYear()));
      const { mode, expenses: existing } = await readYearExpenses(orgId, year);
      const importedTicketIds = new Set(
        existing.map((e) => e.sourceTicketId).filter((v): v is string => Boolean(v))
      );

      const mRes = await fetch(
        `${SUPABASE_URL}/rest/v1/maintenance_tickets?org_id=eq.${orgId}&status=eq.completed&select=id,building,unit,category,description,actual_cost,material_amount,completed_at,created_at,assigned_to`,
        { headers, cache: "no-store" }
      );
      const tickets: Array<Record<string, unknown>> = mRes.ok ? await mRes.json() : [];

      const toAdd: ExpenseRecord[] = [];
      for (const tk of Array.isArray(tickets) ? tickets : []) {
        const tkId = String(tk.id || "");
        if (!tkId || importedTicketIds.has(tkId)) continue;

        const labor = Number(tk.actual_cost) || 0;
        const materials = Number(tk.material_amount) || 0;
        const totalCost = Math.round((labor + materials) * 100) / 100;
        if (totalCost <= 0) continue;

        const rawDate = String(tk.completed_at || tk.created_at || `${year}-01-01`).slice(0, 10);
        if (!rawDate.startsWith(`${year}-`)) continue;

        toAdd.push({
          id: crypto.randomUUID(),
          building: String(tk.building || "Portfolio / General"),
          unit: String(tk.unit || ""),
          expenseDate: rawDate,
          category: "repairs",
          vendor: String(tk.assigned_to || "Maintenance Crew"),
          description: `[Maint Ticket] ${String(tk.category || "Repair")}: ${String(tk.description || "").slice(0, 160)}`,
          amount: totalCost,
          paymentMethod: "Invoice",
          taxDeductible: true,
          receiptUrl: "",
          receiptName: "",
          sourceTicketId: tkId,
          createdBy: email || "admin",
          createdAt: new Date().toISOString(),
        });
      }

      if (toAdd.length === 0) {
        return NextResponse.json({ importedCount: 0, expenses: existing });
      }

      if (mode === "table") {
        const insRes = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify(
            toAdd.map((e) => ({
              id: e.id,
              org_id: orgId,
              building: e.building,
              unit: e.unit,
              expense_date: e.expenseDate,
              category: e.category,
              vendor: e.vendor,
              description: e.description,
              amount: e.amount,
              payment_method: e.paymentMethod,
              tax_deductible: e.taxDeductible,
              receipt_url: e.receiptUrl,
              receipt_name: e.receiptName,
              source_ticket_id: e.sourceTicketId,
              created_by: e.createdBy,
            }))
          ),
        });
        if (!insRes.ok) {
          const errText = await insRes.text();
          throw new Error(`expenses maintenance import (${insRes.status}): ${errText}`);
        }
      } else {
        const merged = [...toAdd, ...existing].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
        await saveFallbackExpenses(orgId, year, merged);
      }

      await writeActivityLog({
        org_id: orgId,
        actor_email: email || "admin",
        actor_name: name || "Owner",
        action: "created",
        resource_type: "expense",
        resource_name: `Imported ${toAdd.length} maintenance expense(s)`,
        resource_id: orgId,
        metadata: { importedCount: toAdd.length, year },
      });

      const refreshed = await readYearExpenses(orgId, year);
      return NextResponse.json({ importedCount: toAdd.length, expenses: refreshed.expenses });
    }

    // ── Standard Create Expense ───────────────────────────────────────────
    const amount = Math.round((Number(body.amount) || 0) * 100) / 100;
    if (amount <= 0) {
      return NextResponse.json({ error: "Expense amount must be greater than $0." }, { status: 400 });
    }

    const rawDate = String(body.expenseDate ?? body.expense_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    const expenseDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);
    const year = Number(expenseDate.slice(0, 4)) || new Date().getFullYear();

    const created: ExpenseRecord = {
      id: crypto.randomUUID(),
      building: String(body.building || "Portfolio / General").trim() || "Portfolio / General",
      unit: String(body.unit || "").trim(),
      expenseDate,
      category: normalizeCategory(body.category),
      vendor: String(body.vendor || "").trim().slice(0, 140),
      description: String(body.description || "").trim().slice(0, 400),
      amount,
      paymentMethod: String(body.paymentMethod ?? body.payment_method ?? "").trim().slice(0, 60),
      taxDeductible: body.taxDeductible !== undefined ? Boolean(body.taxDeductible) : true,
      receiptUrl: String(body.receiptUrl ?? body.receipt_url ?? "").trim(),
      receiptName: String(body.receiptName ?? body.receipt_name ?? "").trim(),
      sourceTicketId: null,
      createdBy: name || email || "Owner",
      createdAt: new Date().toISOString(),
    };

    const { mode, expenses: existing } = await readYearExpenses(orgId, year);

    if (mode === "table") {
      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          id: created.id,
          org_id: orgId,
          building: created.building,
          unit: created.unit,
          expense_date: created.expenseDate,
          category: created.category,
          vendor: created.vendor,
          description: created.description,
          amount: created.amount,
          payment_method: created.paymentMethod,
          tax_deductible: created.taxDeductible,
          receipt_url: created.receiptUrl,
          receipt_name: created.receiptName,
          created_by: created.createdBy,
        }),
      });
      if (!insRes.ok) {
        const errText = await insRes.text();
        throw new Error(`expenses POST (${insRes.status}): ${errText}`);
      }
      const rows = await insRes.json();
      const saved = Array.isArray(rows) && rows[0] ? rowToExpense(rows[0] as Record<string, unknown>) : created;
      await writeActivityLog({
        org_id: orgId,
        actor_email: email || "admin",
        actor_name: name || "Owner",
        action: "created",
        resource_type: "expense",
        resource_name: `${saved.vendor || saved.category} ($${saved.amount.toFixed(2)})`,
        resource_id: saved.id,
        metadata: { category: saved.category, building: saved.building, amount: saved.amount },
      });
      return NextResponse.json({ expense: saved }, { status: 201 });
    }

    const nextList = [created, ...existing].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
    await saveFallbackExpenses(orgId, year, nextList);
    await writeActivityLog({
      org_id: orgId,
      actor_email: email || "admin",
      actor_name: name || "Owner",
      action: "created",
      resource_type: "expense",
      resource_name: `${created.vendor || created.category} ($${created.amount.toFixed(2)})`,
      resource_id: created.id,
      metadata: { category: created.category, building: created.building, amount: created.amount },
    });
    return NextResponse.json({ expense: created }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "Failed to record expense.", { route: "/api/expenses", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const email = user?.email || "admin";
  const name = user?.name || "Owner";

  const id = String(req.nextUrl.searchParams.get("id") || "").trim();
  const year = Math.max(2020, Math.min(2100, Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear()));
  if (!id) {
    return NextResponse.json({ error: "Expense id is required." }, { status: 400 });
  }

  try {
    const { mode, expenses } = await readYearExpenses(orgId, year);
    const target = expenses.find((e) => e.id === id);

    if (mode === "table") {
      const delRes = await fetch(
        `${SUPABASE_URL}/rest/v1/expenses?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
        { method: "DELETE", headers }
      );
      if (!delRes.ok) {
        const errText = await delRes.text();
        throw new Error(`expenses DELETE (${delRes.status}): ${errText}`);
      }
    } else {
      await saveFallbackExpenses(
        orgId,
        year,
        expenses.filter((e) => e.id !== id)
      );
    }

    if (target) {
      await writeActivityLog({
        org_id: orgId,
        actor_email: email || "admin",
        actor_name: name || "Owner",
        action: "deleted",
        resource_type: "expense",
        resource_name: `${target.vendor || target.category} ($${target.amount.toFixed(2)})`,
        resource_id: id,
      });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete expense.", { route: "/api/expenses", orgId });
  }
}
