"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  Upload, FileSpreadsheet, FileText, Camera, CheckCircle2,
  AlertTriangle, AlertCircle, X, ChevronRight, Loader2, Sparkles,
  Trash2, Plus, RefreshCw, Eye, EyeOff, Building, DollarSign,
  Calendar, Layers, CheckSquare, Square, ArrowRight, ShieldCheck,
  HelpCircle, ArrowUpRight
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Tenant } from "./TenantsTab";

export interface StagedTenantRecord {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  monthlyRent: number;
  securityDeposit: number;
  leaseStart: string;
  leaseEnd: string;
  notes: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  selected: boolean;
}

interface IntakeStagingModalProps {
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  knownBuildings?: string[];
  currentOrgName?: string;
}

// Header mapping dictionary for Excel/CSV parsing
const COL_MAP: Record<string, keyof Omit<StagedTenantRecord, "id" | "confidence" | "needsReview" | "selected">> = {
  name: "name", company: "name", tenant: "name", "tenant name": "name", "company name": "name", "business": "name",
  contact: "contactName", "contact name": "contactName", "primary contact": "contactName", rep: "contactName",
  email: "email", "e-mail": "email", "email address": "email",
  phone: "phone", "phone number": "phone", cell: "phone", mobile: "phone", tel: "phone",
  building: "building", property: "building", "property name": "building", location: "building", address: "building", site: "building",
  unit: "unit", suite: "unit", space: "unit", room: "unit", "unit number": "unit", "suite number": "unit",
  rent: "monthlyRent", "monthly rent": "monthlyRent", amount: "monthlyRent", payment: "monthlyRent", "rent amount": "monthlyRent",
  deposit: "securityDeposit", "security deposit": "securityDeposit", sec_dep: "securityDeposit",
  "lease start": "leaseStart", "start date": "leaseStart", "start": "leaseStart", commencement: "leaseStart",
  "lease end": "leaseEnd", "end date": "leaseEnd", "end": "leaseEnd", expiration: "leaseEnd", expires: "leaseEnd",
  notes: "notes", comments: "notes", memo: "notes", remarks: "notes", terms: "notes"
};

function excelDateToISO(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return "";
  }
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 864e5));
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return "";
}

function cleanMoney(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const s = String(val).replace(/[$,\s]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
}

// 4 realistic sample candidate records for instant 1-click test drive
const DEMO_STAGED_RECORDS: StagedTenantRecord[] = [
  {
    id: "sample_1",
    name: "Apex Financial Partners",
    contactName: "Marcus Vance",
    email: "marcus@apexpartners.com",
    phone: "(555) 349-8201",
    building: "The Summit Tower",
    unit: "Suite 1400",
    monthlyRent: 8450,
    securityDeposit: 8450,
    leaseStart: "2025-01-01",
    leaseEnd: "2027-12-31",
    notes: "Full floor tenant, includes 4 reserved executive parking spaces.",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_2",
    name: "Horizon Innovation Lofts",
    contactName: "Elena Rostova",
    email: "elena@horizoncreative.io",
    phone: "(555) 781-9943",
    building: "Horizon Innovation Lofts",
    unit: "Studio 204",
    monthlyRent: 4200,
    securityDeposit: 4200,
    leaseStart: "2025-03-01",
    leaseEnd: "2026-02-28",
    notes: "3% annual CPI escalation; tenant requests fiber optic patch.",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_3",
    name: "Beacon Health Diagnostics",
    contactName: "Dr. Jonathan Ross",
    email: "admin@beaconmed.org",
    phone: "(555) 612-4402",
    building: "The Summit Tower",
    unit: "Suite 310",
    monthlyRent: 6100,
    securityDeposit: 12200,
    leaseStart: "2025-06-01",
    leaseEnd: "2028-05-31",
    notes: "Handwritten note on file: 2 months security deposit held in escrow.",
    confidence: "medium",
    needsReview: true,
    selected: true,
  },
  {
    id: "sample_4",
    name: "Urban Roast Roasters & Cafe",
    contactName: "Maya Lin",
    email: "contact@urbanroast.com",
    phone: "(555) 902-1134",
    building: "Metro Point Retail",
    unit: "Retail Bay A",
    monthlyRent: 3850,
    securityDeposit: 3850,
    leaseStart: "2024-11-01",
    leaseEnd: "2026-10-31",
    notes: "Scanned lease agreement: Outdoor patio seating permit attached.",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
];

export default function IntakeStagingModal({
  onClose,
  onImportSuccess,
  knownBuildings = [],
  currentOrgName = "Your Portfolio",
}: IntakeStagingModalProps) {
  // Step state: 'upload' -> 'scanning' -> 'review' -> 'committing' -> 'success'
  const [step, setStep] = useState<"upload" | "scanning" | "review" | "committing" | "success">("upload");
  const [scanStatusText, setScanStatusText] = useState("Analyzing document structure...");
  const [stagedRecords, setStagedRecords] = useState<StagedTenantRecord[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState("");
  const [detectedBuilding, setDetectedBuilding] = useState("");
  const [sourceFile, setSourceFile] = useState<{ name: string; type: string; url?: string } | null>(null);
  const [showSourceDrawer, setShowSourceDrawer] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [importCount, setImportCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Available building suggestions
  const buildingSuggestions = useMemo(() => {
    const list = Array.from(new Set([...knownBuildings, detectedBuilding])).filter(Boolean);
    return list.length ? list : ["The Summit Tower", "Horizon Innovation Lofts", "Metro Point Retail", "Nexus Logistics Hub"];
  }, [knownBuildings, detectedBuilding]);

  // Handle SheetJS Excel / CSV upload
  const handleExcelUpload = useCallback(async (file: File) => {
    setErrorMsg("");
    setSourceFile({ name: file.name, type: "spreadsheet" });
    setStep("scanning");
    setScanStatusText("Parsing spreadsheet columns & financial ledger...");

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) {
        throw new Error("Spreadsheet appears to be empty.");
      }

      const headers = Object.keys(rows[0]);
      const mapped: StagedTenantRecord[] = rows.map((row, idx) => {
        let name = "";
        let contactName = "";
        let email = "";
        let phone = "";
        let building = "";
        let unit = "";
        let monthlyRent = 0;
        let securityDeposit = 0;
        let leaseStart = "";
        let leaseEnd = "";
        let notes = "";

        headers.forEach((h) => {
          const key = h.toLowerCase().trim();
          const target = COL_MAP[key];
          const val = row[h];
          if (!target || val === undefined || val === null) return;

          if (target === "name") name = String(val).trim();
          else if (target === "contactName") contactName = String(val).trim();
          else if (target === "email") email = String(val).trim();
          else if (target === "phone") phone = String(val).trim();
          else if (target === "building") building = String(val).trim();
          else if (target === "unit") unit = String(val).trim();
          else if (target === "monthlyRent") monthlyRent = cleanMoney(val);
          else if (target === "securityDeposit") securityDeposit = cleanMoney(val);
          else if (target === "leaseStart") leaseStart = excelDateToISO(val);
          else if (target === "leaseEnd") leaseEnd = excelDateToISO(val);
          else if (target === "notes") notes = String(val).trim();
        });

        const isMissingCritical = !name || monthlyRent <= 0;
        return {
          id: `excel_${Date.now()}_${idx}`,
          name: name || `Tenant Row ${idx + 1}`,
          contactName,
          email,
          phone,
          building: building || buildingSuggestions[0] || "Main Building",
          unit: unit || `Suite ${idx + 101}`,
          monthlyRent,
          securityDeposit: securityDeposit || monthlyRent,
          leaseStart,
          leaseEnd,
          notes,
          confidence: isMissingCritical ? "low" : "high",
          needsReview: isMissingCritical || !leaseStart || !leaseEnd,
          selected: !isMissingCritical,
        };
      });

      setStagedRecords(mapped);
      setPortfolioSummary(`Imported ${mapped.length} records from ${file.name}`);
      setStep("review");
    } catch (err) {
      console.error("Excel parse failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse spreadsheet.");
      setStep("upload");
    }
  }, [buildingSuggestions]);

  // Handle Image / Scanned Document / Handwriting OCR via Gemini 2.5 Flash
  const handleOcrUpload = useCallback(async (file: File) => {
    setErrorMsg("");
    const fileUrl = URL.createObjectURL(file);
    setSourceFile({ name: file.name, type: file.type, url: fileUrl });
    setStep("scanning");

    // Cycle scanning status messages for engaging feedback
    const statusSequence = [
      "Analyzing document orientation & typography...",
      "Transcribing handwriting & lease agreements...",
      "Extracting tenant names, suite numbers & rent rates...",
      "Formulating validation staging table..."
    ];
    let seqIdx = 0;
    const interval = setInterval(() => {
      seqIdx = (seqIdx + 1) % statusSequence.length;
      setScanStatusText(statusSequence[seqIdx]);
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notes", `Source from user upload for ${currentOrgName}`);

      const res = await fetch("/api/ai/intake-ocr", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server OCR returned ${res.status}`);
      }

      const data = await res.json();
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No tenant records could be discerned from this image. Please check image clarity or try another file.");
      }

      setStagedRecords(data.candidates);
      setPortfolioSummary(data.portfolioSummary || "Extracted records from document");
      if (data.detectedBuildingName) {
        setDetectedBuilding(data.detectedBuildingName);
      }
      setStep("review");
    } catch (err) {
      clearInterval(interval);
      console.error("OCR Intake error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Document analysis failed.");
      setStep("upload");
    }
  }, [currentOrgName]);

  // Drag and drop dropzone handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const name = file.name.toLowerCase();

    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
      handleExcelUpload(file);
    } else {
      handleOcrUpload(file);
    }
  }, [handleExcelUpload, handleOcrUpload]);

  // Load sample test data in 1 click
  const handleLoadSample = () => {
    setErrorMsg("");
    setSourceFile({ name: "Sample Landlord Legal Pad & Leases (Demo).png", type: "sample" });
    setStagedRecords(DEMO_STAGED_RECORDS);
    setPortfolioSummary("4 Verified commercial & retail leases loaded from sample intake roll.");
    setDetectedBuilding("The Summit Tower");
    setStep("review");
  };

  // Row update helper
  const updateRow = (id: string, field: keyof StagedTenantRecord, value: any) => {
    setStagedRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        const updated = { ...rec, [field]: value };
        // If user filled in name and positive rent, mark review as resolved if previously low
        if (field === "name" || field === "monthlyRent") {
          if (updated.name.trim() && updated.monthlyRent > 0) {
            updated.needsReview = false;
            updated.confidence = "high";
          }
        }
        return updated;
      })
    );
  };

  // Delete row
  const deleteRow = (id: string) => {
    setStagedRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Add empty row
  const addEmptyRow = () => {
    const newRow: StagedTenantRecord = {
      id: `manual_${Date.now()}`,
      name: "",
      contactName: "",
      email: "",
      phone: "",
      building: detectedBuilding || buildingSuggestions[0] || "Main Building",
      unit: "",
      monthlyRent: 0,
      securityDeposit: 0,
      leaseStart: "",
      leaseEnd: "",
      notes: "Manually added record",
      confidence: "medium",
      needsReview: true,
      selected: true,
    };
    setStagedRecords((prev) => [...prev, newRow]);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    const allSelected = stagedRecords.every((r) => r.selected);
    setStagedRecords((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  // Aggregated totals
  const selectedRecords = stagedRecords.filter((r) => r.selected);
  const totalRent = selectedRecords.reduce((sum, r) => sum + (Number(r.monthlyRent) || 0), 0);
  const totalDeposit = selectedRecords.reduce((sum, r) => sum + (Number(r.securityDeposit) || 0), 0);
  const needsReviewCount = stagedRecords.filter((r) => r.needsReview).length;
  const invalidSelected = selectedRecords.filter((r) => !r.name.trim() || r.monthlyRent <= 0).length;

  // Final Commit action
  const handleCommit = async () => {
    if (selectedRecords.length === 0) return;
    if (invalidSelected > 0) {
      setErrorMsg(`Please supply a valid Name and Monthly Rent for all ${invalidSelected} selected row(s) before importing.`);
      return;
    }

    setStep("committing");
    setErrorMsg("");

    try {
      const payload = selectedRecords.map((r) => ({
        name: r.name.trim(),
        contact_name: r.contactName.trim(),
        email: r.email.trim(),
        phone: r.phone.trim(),
        building: r.building.trim(),
        unit: r.unit.trim(),
        monthly_rent: Number(r.monthlyRent) || 0,
        security_deposit: Number(r.securityDeposit) || 0,
        lease_start: r.leaseStart || null,
        lease_end: r.leaseEnd || null,
        status: "active",
        notes: r.notes.trim() ? `${r.notes.trim()} (Imported via AI Intake)` : "Imported via AI Intake",
      }));

      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenants: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Insert failed with HTTP ${res.status}`);
      }

      setImportCount(payload.length);
      setStep("success");
      onImportSuccess(payload.length);
    } catch (err) {
      console.error("Batch tenant import failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to commit tenants to database.");
      setStep("review");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-[#080C14] border border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.15)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B1020]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  AI Tenant & Rent Roll Intake
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300">
                  {currentOrgName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={11} /> Human-In-The-Loop Staging
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Drop spreadsheets, photos of handwritten legal pads, or scanned lease contracts. Review & verify detected rows before committing to database.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Upload / Ingestion Screen */}
          {step === "upload" && (
            <div className="space-y-6">
              {/* Primary Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative rounded-2xl border-2 border-dashed border-sky-400/30 hover:border-sky-400/70 bg-gradient-to-b from-sky-950/10 via-black/40 to-black/60 p-8 sm:p-12 text-center transition-all duration-300 group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.name.match(/\.(xlsx|xls|csv)$/i)) {
                      handleExcelUpload(f);
                    } else {
                      handleOcrUpload(f);
                    }
                  }}
                />

                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(56,189,248,0.35)] transition-all">
                    <Upload size={30} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">
                      Drag & Drop Rent Roll, Handwritten Notes, or Leases
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Supports Excel (<code className="text-sky-300">.xlsx, .csv</code>), physical documents (<code className="text-sky-300">PDF, JPG, PNG</code>), and camera snaps of legal pad notes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <FileText size={14} /> Browse Files
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Camera size={14} /> Snap Photo (Camera)
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleOcrUpload(f);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Instant Test Drive / Quick Presets */}
              <div className="rounded-xl border border-white/12 bg-white/[0.02] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Testing a New Account or Property?</h4>
                    <p className="text-[11px] text-gray-400">
                      Instantly populate 4 sample commercial leases & handwritten notes without uploading your own file.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-[0_0_12px_rgba(255,255,255,0.06)]"
                >
                  ⚡ Load Sample Test Roll <ArrowRight size={13} />
                </button>
              </div>

              {/* Supported Formats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <FileSpreadsheet size={15} /> Excel / CSV Spreadsheets
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Instant client-side column mapping. Recognizes tenant names, phone, rent, deposits, and dates automatically.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                    <FileText size={15} /> Lease Agreements & Scans
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Gemini 2.5 Flash Vision extracts commencement, expiration, monthly base rent, security deposits, and special terms.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Camera size={15} /> Handwritten Legal Pad Notes
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Snap a photo of your notebook or yellow legal pad. Vision AI parses handwriting into structured tenant ledger records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Scanning & OCR Progress */}
          {step === "scanning" && (
            <div className="py-16 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-sky-400/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-sky-500/10 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">OpsIQ Document Intelligence</h3>
                <p className="text-xs text-sky-300 font-medium tracking-wide animate-pulse">
                  {scanStatusText}
                </p>
                <p className="text-[11px] text-gray-500">
                  Processing: {sourceFile?.name || "Document"}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Staging & Review Table (The Human-in-the-Loop Core) */}
          {(step === "review" || step === "committing") && (
            <div className="space-y-4">
              {/* Review Summary Bar */}
              <div className="p-4 rounded-xl bg-[#0B1020] border border-white/15 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
                    >
                      {stagedRecords.every((r) => r.selected) ? <CheckSquare size={16} /> : <Square size={16} />}
                      Select All ({stagedRecords.length})
                    </button>
                  </div>

                  <div className="h-4 w-px bg-white/10" />

                  <div className="text-xs text-gray-300">
                    Selected: <span className="font-bold text-white">{selectedRecords.length}</span> / {stagedRecords.length}
                  </div>

                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <DollarSign size={13} />
                    <span>Total Rent: <strong>${totalRent.toLocaleString()}/mo</strong></span>
                  </div>

                  <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <span>Deposits: <strong>${totalDeposit.toLocaleString()}</strong></span>
                  </div>

                  {needsReviewCount > 0 && (
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={11} /> {needsReviewCount} need verification
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {sourceFile?.url && (
                    <button
                      type="button"
                      onClick={() => setShowSourceDrawer(!showSourceDrawer)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                        showSourceDrawer
                          ? "bg-sky-500/20 border-sky-400/40 text-sky-300"
                          : "bg-white/[0.04] border-white/10 text-gray-300 hover:text-white"
                      }`}
                    >
                      {showSourceDrawer ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showSourceDrawer ? "Hide Source Scan" : "View Source Scan"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={addEmptyRow}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Add Row
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("upload");
                      setStagedRecords([]);
                      setSourceFile(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Re-scan
                  </button>
                </div>
              </div>

              {/* Source Document Cross-Reference Preview Drawer */}
              {showSourceDrawer && sourceFile?.url && (
                <div className="p-4 rounded-xl border border-sky-400/30 bg-black/60 space-y-2">
                  <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} /> Source Document Cross-Reference: {sourceFile.name}
                    </span>
                    <span className="text-gray-400 text-[11px]">Compare detected data against original document</span>
                  </div>
                  <div className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/80 flex items-center justify-center p-2">
                    <img
                      src={sourceFile.url}
                      alt="Source Scan"
                      className="max-h-64 object-contain rounded shadow-lg"
                    />
                  </div>
                </div>
              )}

              {/* Staging Data Grid */}
              <div className="rounded-xl border border-white/12 bg-black/40 overflow-hidden shadow-inner">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0B1020] text-gray-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-white/10">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">Sel</th>
                        <th className="py-3 px-3 w-24">Status</th>
                        <th className="py-3 px-3 min-w-[170px]">Tenant / Company *</th>
                        <th className="py-3 px-3 min-w-[140px]">Contact Person</th>
                        <th className="py-3 px-3 min-w-[160px]">Property / Building</th>
                        <th className="py-3 px-3 min-w-[100px]">Suite / Unit</th>
                        <th className="py-3 px-3 min-w-[110px]">Rent ($/mo) *</th>
                        <th className="py-3 px-3 min-w-[100px]">Deposit ($)</th>
                        <th className="py-3 px-3 min-w-[110px]">Lease Start</th>
                        <th className="py-3 px-3 min-w-[110px]">Lease End</th>
                        <th className="py-3 px-3 min-w-[180px]">Notes / Terms</th>
                        <th className="py-3 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {stagedRecords.map((r, idx) => {
                        const isInvalid = !r.name.trim() || r.monthlyRent <= 0;
                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-white/[0.02] transition-colors ${
                              !r.selected ? "opacity-50 bg-black/30" : isInvalid ? "bg-red-500/5" : ""
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={r.selected}
                                onChange={(e) => updateRow(r.id, "selected", e.target.checked)}
                                className="rounded border-white/30 text-sky-500 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            {/* Status badge */}
                            <td className="py-2.5 px-3">
                              {isInvalid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
                                  <AlertCircle size={10} /> Missing Info
                                </span>
                              ) : r.needsReview ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={10} /> Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={10} /> Verified
                                </span>
                              )}
                            </td>

                            {/* Tenant / Company Name */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={r.name}
                                onChange={(e) => updateRow(r.id, "name", e.target.value)}
                                placeholder="Required company name..."
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border text-white outline-none focus:border-sky-400 transition-all ${
                                  !r.name.trim() ? "border-red-500/60 bg-red-500/5" : "border-white/10"
                                }`}
                              />
                            </td>

                            {/* Contact Person */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={r.contactName}
                                onChange={(e) => updateRow(r.id, "contactName", e.target.value)}
                                placeholder="Contact name..."
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-sky-400"
                              />
                            </td>

                            {/* Building / Property */}
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`buildings-${r.id}`}
                                  value={r.building}
                                  onChange={(e) => updateRow(r.id, "building", e.target.value)}
                                  placeholder="Select or enter property..."
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-sky-400"
                                />
                                <datalist id={`buildings-${r.id}`}>
                                  {buildingSuggestions.map((b) => (
                                    <option key={b} value={b} />
                                  ))}
                                </datalist>
                              </div>
                            </td>

                            {/* Unit / Suite */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={r.unit}
                                onChange={(e) => updateRow(r.id, "unit", e.target.value)}
                                placeholder="Suite 200..."
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 text-white outline-none focus:border-sky-400"
                              />
                            </td>

                            {/* Monthly Rent */}
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                <input
                                  type="number"
                                  value={r.monthlyRent || ""}
                                  onChange={(e) => updateRow(r.id, "monthlyRent", Number(e.target.value))}
                                  placeholder="0"
                                  className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg text-xs bg-black/40 border text-emerald-400 font-bold outline-none focus:border-sky-400 ${
                                    r.monthlyRent <= 0 ? "border-red-500/60 bg-red-500/5" : "border-white/10"
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Security Deposit */}
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                <input
                                  type="number"
                                  value={r.securityDeposit || ""}
                                  onChange={(e) => updateRow(r.id, "securityDeposit", Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full pl-6 pr-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 text-amber-300 font-medium outline-none focus:border-sky-400"
                                />
                              </div>
                            </td>

                            {/* Lease Start */}
                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                value={r.leaseStart}
                                onChange={(e) => updateRow(r.id, "leaseStart", e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg text-[11px] bg-black/40 border border-white/10 text-gray-300 outline-none focus:border-sky-400"
                              />
                            </td>

                            {/* Lease End */}
                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                value={r.leaseEnd}
                                onChange={(e) => updateRow(r.id, "leaseEnd", e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg text-[11px] bg-black/40 border border-white/10 text-gray-300 outline-none focus:border-sky-400"
                              />
                            </td>

                            {/* Notes / Special Terms */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={r.notes}
                                onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                                placeholder="Terms, options, deposits..."
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 text-gray-300 outline-none focus:border-sky-400"
                              />
                            </td>

                            {/* Delete action */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => deleteRow(r.id)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remove Row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Success Message Screen */}
          {step === "success" && (
            <div className="py-12 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">
                  Successfully Imported {importCount} Tenants!
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  All selected tenants have been verified and permanently committed to your portfolio database. The active rent ledger and dashboard metrics have been updated.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:opacity-95 transition-all"
                >
                  Return to Tenant Directory
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {(step === "review" || step === "committing") && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0B1020]/95">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Final user review required prior to database commit.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={step === "committing"}
                className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommit}
                disabled={step === "committing" || selectedRecords.length === 0 || invalidSelected > 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === "committing" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Committing to Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Approve & Import {selectedRecords.length} Tenant{selectedRecords.length === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
