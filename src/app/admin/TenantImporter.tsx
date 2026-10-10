"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ChevronRight, Loader2, Download, RefreshCw } from "lucide-react";
import type { Tenant } from "./TenantsTab";

// ─── Column mapping: Excel header variants → our field keys ──────────────────

const COL_MAP: Record<string, keyof MappedRow> = {
  // name
  "name": "name", "company": "name", "tenant": "name", "tenant name": "name",
  "company name": "name", "business": "name", "business name": "name",
  // contact
  "contact": "contactName", "contact name": "contactName", "primary contact": "contactName",
  "contact person": "contactName", "rep": "contactName", "person": "contactName",
  // email
  "email": "email", "e-mail": "email", "email address": "email", "e mail": "email",
  // phone
  "phone": "phone", "phone number": "phone", "cell": "phone", "mobile": "phone",
  "telephone": "phone", "tel": "phone",
  // building
  "building": "building", "property": "building", "property name": "building",
  "location": "building", "address": "building", "site": "building",
  // unit
  "unit": "unit", "suite": "unit", "space": "unit", "room": "unit",
  "unit number": "unit", "suite number": "unit", "office": "unit",
  // rent
  "rent": "monthlyRent", "monthly rent": "monthlyRent", "amount": "monthlyRent",
  "monthly": "monthlyRent", "rent amount": "monthlyRent", "lease amount": "monthlyRent",
  "payment": "monthlyRent",
  // lease start
  "lease start": "leaseStart", "start date": "leaseStart", "from": "leaseStart",
  "move in": "leaseStart", "commencement": "leaseStart", "start": "leaseStart",
  // lease end
  "lease end": "leaseEnd", "end date": "leaseEnd", "expiration": "leaseEnd",
  "expires": "leaseEnd", "expiry": "leaseEnd", "to": "leaseEnd", "end": "leaseEnd",
  "lease expiration": "leaseEnd",
  // notes
  "notes": "notes", "comments": "notes", "note": "notes", "memo": "notes",
  "remarks": "notes",
  // status
  "status": "status",
};

interface MappedRow {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  monthlyRent: string;
  leaseStart: string;
  leaseEnd: string;
  notes: string;
  status: string;
  _raw: Record<string, string>; // unmapped columns
  _rowNum: number;
  _error?: string;
}

interface ImportResult {
  mapped: MappedRow[];
  unmappedCols: string[];
  totalRows: number;
}

// ─── Excel date serial → ISO string ─────────────────────────────────────────

function excelDateToISO(val: unknown): string {
  if (!val) return "";
  // Already a string that looks like a date
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return "";
  }
  // Excel serial number
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 864e5));
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return "";
}

function cleanMoney(val: unknown): string {
  if (!val) return "0";
  const s = String(val).replace(/[$,\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? "0" : String(Math.round(n));
}

function normaliseStatus(val: string): "active" | "pending" | "expired" {
  const v = val.toLowerCase().trim();
  if (v.includes("expir") || v.includes("ended")) return "expired";
  if (v.includes("pend") || v.includes("prospect") || v.includes("new")) return "pending";
  return "active";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onImport: (tenants: Partial<Tenant>[]) => Promise<void>;
  onClose: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function TenantImporter({ onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<{ row: number; name: string; error: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    // Dynamically load xlsx from CDN (no npm needed)
    if (!(window as any).XLSX) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Excel parser"));
        document.head.appendChild(script);
      });
    }
    const XLSX = (window as any).XLSX;

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) throw new Error("The spreadsheet appears to be empty.");

    const headers = Object.keys(rows[0]);
    const usedCols = new Set<string>();
    const unmappedCols: string[] = [];

    headers.forEach(h => {
      const key = h.toLowerCase().trim();
      if (COL_MAP[key]) usedCols.add(h);
      else unmappedCols.push(h);
    });

    const mapped: MappedRow[] = rows.map((row, i) => {
      const m: MappedRow = {
        name: "", contactName: "", email: "", phone: "",
        building: "", unit: "", monthlyRent: "0",
        leaseStart: "", leaseEnd: "", notes: "", status: "active",
        _raw: {}, _rowNum: i + 2,
      };

      headers.forEach(h => {
        const fieldKey = COL_MAP[h.toLowerCase().trim()];
        const rawVal = String(row[h] ?? "").trim();
        if (fieldKey) {
          if (fieldKey === "monthlyRent") m.monthlyRent = cleanMoney(row[h]);
          else if (fieldKey === "leaseStart") m.leaseStart = excelDateToISO(row[h]);
          else if (fieldKey === "leaseEnd") m.leaseEnd = excelDateToISO(row[h]);
          else if (fieldKey === "status") m.status = normaliseStatus(rawVal);
          else (m as any)[fieldKey] = rawVal;
        } else {
          m._raw[h] = rawVal;
        }
      });

      if (!m.name) m._error = "Missing tenant name";
      return m;
    }).filter(r => r.name || r.email); // drop totally blank rows

    setResult({ mapped, unmappedCols, totalRows: rows.length });
    setSelected(new Set(mapped.filter(r => !r._error).map((_, i) => i)));
    setStep("preview");
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Please upload an Excel (.xlsx/.xls) or CSV file.");
      return;
    }
    try { await parseFile(file); }
    catch (e: any) { alert(e.message || "Failed to parse file."); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleRow = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === result!.mapped.length) setSelected(new Set());
    else setSelected(new Set(result!.mapped.map((_, i) => i)));
  };

  const doImport = async () => {
    if (!result) return;
    const toImport = result.mapped.filter((_, i) => selected.has(i));
    setProgress({ done: 0, total: toImport.length });
    setStep("importing");

    const errs: typeof errors = [];
    const tenants: Partial<Tenant>[] = toImport.map(r => ({
      name: r.name,
      contactName: r.contactName,
      email: r.email,
      phone: r.phone,
      building: r.building,
      unit: r.unit,
      monthlyRent: Number(r.monthlyRent) || 0,
      leaseStart: r.leaseStart || null,
      leaseEnd: r.leaseEnd || null,
      renewalDate: null,
      leaseAlertDays: 60,
      escalationPct: 0,
      escalationDate: null,
      status: (r.status as "active" | "pending" | "expired") || "active",
      notes: [
        r.notes,
        Object.entries(r._raw).map(([k, v]) => v ? `${k}: ${v}` : "").filter(Boolean).join(" | "),
      ].filter(Boolean).join("\n"),
    }));

    try {
      await onImport(tenants);
      setProgress({ done: tenants.length, total: tenants.length });
    } catch (e: any) {
      errs.push({ row: 0, name: "Batch", error: e.message || "Import failed" });
    }
    setErrors(errs);
    setStep("done");
  };

  const downloadTemplate = () => {
    const csv = [
      "Tenant Name,Primary Contact,Email,Phone,Building,Unit,Monthly Rent,Lease Start,Lease End,Status,Notes",
      "Bristol Tech Co.,Jane Smith,jane@bristoltech.com,(423) 555-1234,The Executive,Suite 204,4200,2023-01-01,2025-12-31,active,",
      "Main Street Salon,Bob Jones,bob@salon.com,(276) 555-9876,CoWork Center,Desk 12,800,2024-06-01,2025-05-31,active,",
    ].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "vision_tenant_import_template.csv";
    a.click();
  };

  const FIELD_CLS = "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 text-xs text-white w-full focus:border-[rgba(74,222,128,0.4)] outline-none";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0D1117] border border-[rgba(74,222,128,0.2)] rounded-3xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-black" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Import Tenants from Excel</h2>
              <p className="text-[11px] text-gray-500">Upload .xlsx, .xls, or .csv — we map the columns automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="p-6 space-y-5">
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-[#4ADE80] bg-[rgba(74,222,128,0.05)]" : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(74,222,128,0.4)] hover:bg-[rgba(74,222,128,0.02)]"}`}
            >
              <Upload size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white mb-1">Drop your Excel or CSV file here</p>
              <p className="text-xs text-gray-500">or click to browse — .xlsx, .xls, .csv supported</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {/* Column guide */}
            <div className="glass rounded-2xl p-4 border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs font-black text-white mb-3">📋 Recognised Column Names</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-500">
                {[
                  ["Tenant/Name/Company", "→ Tenant Name"],
                  ["Email/E-Mail", "→ Email"],
                  ["Phone/Cell/Mobile", "→ Phone"],
                  ["Contact/Primary Contact", "→ Contact Person"],
                  ["Building/Property/Location", "→ Building"],
                  ["Unit/Suite/Space", "→ Unit"],
                  ["Rent/Monthly Rent", "→ Monthly Rent"],
                  ["Lease Start/Start Date", "→ Lease Start"],
                  ["Lease End/Expiration", "→ Lease End"],
                  ["Status", "→ Status"],
                  ["Notes/Comments", "→ Notes"],
                  ["Any other column", "→ Saved in Notes"],
                ].map(([a, b]) => (
                  <div key={a} className="flex flex-col gap-0.5">
                    <span className="text-gray-400 font-medium">{a}</span>
                    <span className="text-[#4ADE80]">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={downloadTemplate}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#4ADE80] transition-colors">
              <Download size={12} /> Download blank template CSV
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && result && (
          <div className="p-6 space-y-4">
            {/* Stats */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="glass rounded-xl px-3 py-2 border border-[rgba(74,222,128,0.15)]">
                <span className="text-gray-500">Found </span>
                <span className="font-black text-white">{result.totalRows}</span>
                <span className="text-gray-500"> rows</span>
              </div>
              <div className="glass rounded-xl px-3 py-2 border border-[rgba(74,222,128,0.15)]">
                <span className="text-gray-500">Ready to import </span>
                <span className="font-black text-[#4ADE80]">{selected.size}</span>
              </div>
              {result.mapped.filter(r => r._error).length > 0 && (
                <div className="glass rounded-xl px-3 py-2 border border-[rgba(239,68,68,0.3)]">
                  <span className="text-gray-500">Flagged </span>
                  <span className="font-black text-red-400">{result.mapped.filter(r => r._error).length}</span>
                </div>
              )}
              {result.unmappedCols.length > 0 && (
                <div className="glass rounded-xl px-3 py-2 border border-[rgba(250,204,21,0.3)]">
                  <span className="text-[#FACC15]">{result.unmappedCols.length} unrecognised column{result.unmappedCols.length > 1 ? "s" : ""} → saved in Notes</span>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-[rgba(255,255,255,0.06)]">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.06)]">
                    <th className="p-2 text-left w-8">
                      <input type="checkbox" checked={selected.size === result.mapped.length}
                        onChange={toggleAll} className="accent-[#4ADE80]" />
                    </th>
                    {["Tenant Name","Contact","Email","Phone","Building","Unit","Rent/mo","Lease Start","Lease End","Status","⚠"].map(h => (
                      <th key={h} className="p-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.mapped.map((row, i) => (
                    <tr key={i}
                      className={`border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                        row._error ? "opacity-60 bg-[rgba(239,68,68,0.03)]" : selected.has(i) ? "bg-[rgba(74,222,128,0.02)]" : ""
                      }`}
                    >
                      <td className="p-2">
                        <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)}
                          disabled={!!row._error} className="accent-[#4ADE80]" />
                      </td>
                      <td className="p-2"><input className={FIELD_CLS} defaultValue={row.name}
                        onChange={e => { result.mapped[i].name = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} defaultValue={row.contactName}
                        onChange={e => { result.mapped[i].contactName = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} defaultValue={row.email}
                        onChange={e => { result.mapped[i].email = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} defaultValue={row.phone}
                        onChange={e => { result.mapped[i].phone = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} defaultValue={row.building}
                        onChange={e => { result.mapped[i].building = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} style={{ width: 60 }} defaultValue={row.unit}
                        onChange={e => { result.mapped[i].unit = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} style={{ width: 72 }} defaultValue={row.monthlyRent}
                        onChange={e => { result.mapped[i].monthlyRent = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} style={{ width: 96 }} defaultValue={row.leaseStart}
                        onChange={e => { result.mapped[i].leaseStart = e.target.value; }} /></td>
                      <td className="p-2"><input className={FIELD_CLS} style={{ width: 96 }} defaultValue={row.leaseEnd}
                        onChange={e => { result.mapped[i].leaseEnd = e.target.value; }} /></td>
                      <td className="p-2">
                        <select className={FIELD_CLS} defaultValue={row.status}
                          onChange={e => { result.mapped[i].status = e.target.value; }}>
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>
                      <td className="p-2">
                        {row._error
                          ? <span title={row._error} className="text-red-400"><AlertTriangle size={12} /></span>
                          : <span className="text-[#4ADE80]"><CheckCircle2 size={12} /></span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-gray-600">
              ✏️ You can edit any cell above before importing. All imported tenants are fully editable afterward.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStep("upload"); setResult(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white text-xs font-bold transition-colors">
                <RefreshCw size={12} /> Upload Different File
              </button>
              <button onClick={doImport} disabled={selected.size === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all">
                Import {selected.size} Tenant{selected.size !== 1 ? "s" : ""} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="p-12 flex flex-col items-center gap-4">
            <Loader2 size={36} className="animate-spin text-[#4ADE80]" />
            <p className="text-white font-black">Importing tenants…</p>
            <p className="text-xs text-gray-500">{progress.done} of {progress.total} complete</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center">
              <CheckCircle2 size={28} className="text-black" />
            </div>
            <h3 className="text-xl font-black text-white">Import Complete!</h3>
            <p className="text-sm text-gray-400">
              <span className="text-[#4ADE80] font-black">{progress.total - errors.length}</span> tenant{progress.total - errors.length !== 1 ? "s" : ""} imported successfully.
              {errors.length > 0 && <> <span className="text-red-400 font-black">{errors.length}</span> failed.</>}
            </p>
            <p className="text-xs text-gray-600">All profiles are ready to edit in the Tenants tab.</p>
            <button onClick={onClose}
              className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-black text-sm hover:opacity-90 transition-all">
              View Tenants →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
