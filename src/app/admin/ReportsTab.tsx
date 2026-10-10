"use client";

import React, { useState, useEffect } from "react";
import {
  FileText, Printer, Sparkles, Loader2, TrendingUp, Wrench,
  DollarSign, CheckCircle2, AlertTriangle, RefreshCw, Calendar, ArrowRight,
} from "lucide-react";

interface QBRMetric {
  totalLeads: number;
  activeLeadsCount: number;
  conversionRate: number;
  pipelineValue: number;
  totalTickets: number;
  completedTicketsCount: number;
  slaCompliancePct: number;
  avgResponseTime: string;
  maintEstCost: number;
  maintActCost: number;
  totalCleaning: number;
  completedCleaningCount: number;
  cleaningEstCost: number;
  cleaningActCost: number;
  activityCount: number;
}

interface QBRReport {
  executiveSummary: string;
  achievements: Array<{ title: string; description: string }>;
  operationalWeaknesses: Array<{ title: string; description: string }>;
  financialAnalysis: string;
  actionPlan: Array<{ step: string; timeframe: string; details: string }>;
}

export default function ReportsTab({ showHeader = true }: { showHeader?: boolean }) {
  const [metrics, setMetrics] = useState<QBRMetric | null>(null);
  const [report, setReport] = useState<QBRReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");

  const fetchQBR = async () => {
    setLoading(true);
    setError("");
    setLoadingStep(1);

    // Simulate stepping through aggregation steps for a premium look
    const steps = [
      "Aggregating pipeline leads & conversion statistics...",
      "Analyzing maintenance work orders & SLA compliance times...",
      "Summarizing cleaning costs & scheduling parameters...",
      "Sending compiled telemetry to Gemini for analysis..."
    ];

    const timer = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < steps.length) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 1000);

    try {
      const res = await fetch("/api/qbr");
      const data = await res.json();
      clearInterval(timer);

      if (data.success) {
        setMetrics(data.metrics);
        setReport(data.report);
      } else {
        setError(data.error || "Failed to generate QBR.");
      }
    } catch (err: any) {
      clearInterval(timer);
      setError(err.message || "Failed to establish server connection.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-load raw metrics on mount (if available) without generating full QBR
  useEffect(() => {
    fetch("/api/qbr")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.metrics) {
          setMetrics(d.metrics);
        }
      })
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const stepsList = [
    "",
    "Aggregating pipeline leads & conversion statistics...",
    "Analyzing maintenance work orders & SLA compliance times...",
    "Summarizing cleaning costs & scheduling parameters...",
    "Sending compiled telemetry to Gemini for analysis..."
  ];

  return (
    <div className="space-y-6 qbr-tab-container">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-4 no-print">
        {showHeader && (
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FileText className="text-[#3B82F6]" size={20} />
              Quarterly Business Review (QBR)
            </h2>
            <p className="text-xs text-gray-500">Live operational audit & AI-generated executive summaries.</p>
          </div>
        )}
        <div className={`flex items-center gap-2 ${showHeader ? "" : "ml-auto"}`}>
          {report && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-300 text-xs font-bold hover:bg-[rgba(255,255,255,0.04)] transition-all"
            >
              <Printer size={12} />
              Print / Save PDF
            </button>
          )}
          <button
            onClick={fetchQBR}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white text-xs font-black hover:opacity-90 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {report ? "Regenerate QBR" : "Generate QBR"}
          </button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp size={10} className="text-[#4ADE80]" /> Pipeline Value
            </p>
            <p className="text-2xl font-black text-[#4ADE80]">${metrics.pipelineValue.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 mt-1">{metrics.activeLeadsCount} active leads under management</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <Wrench size={10} className="text-[#F97316]" /> SLA Compliance
            </p>
            <p className="text-2xl font-black text-white" style={{ color: metrics.slaCompliancePct >= 90 ? "#4ADE80" : "#FACC15" }}>
              {metrics.slaCompliancePct}%
            </p>
            <p className="text-[10px] text-gray-600 mt-1">Avg response time: {metrics.avgResponseTime}</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <CheckCircle2 size={10} className="text-[#3B82F6]" /> Conversion Rate
            </p>
            <p className="text-2xl font-black text-[#3B82F6]">{metrics.conversionRate}%</p>
            <p className="text-[10px] text-gray-600 mt-1">{metrics.totalLeads} total leads created</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
              <DollarSign size={10} className="text-[#A78BFA]" /> Operations Budget
            </p>
            <p className="text-2xl font-black text-[#A78BFA]">
              ${(metrics.maintActCost + metrics.cleaningActCost).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-600 mt-1">Est budget: ${(metrics.maintEstCost + metrics.cleaningEstCost).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-2xl no-print">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <Loader2 size={36} className="text-[#3B82F6] animate-spin absolute" />
            <Sparkles size={16} className="text-[#4ADE80]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-bold text-base">Generating QBR Presentation</h3>
            <p className="text-xs text-gray-500 animate-pulse">{stepsList[loadingStep]}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] flex items-start gap-2.5 text-red-400 no-print">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold">Failed to compile QBR</p>
            <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Placeholder State */}
      {!report && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-2xl no-print">
          <span className="text-5xl">📊</span>
          <div className="space-y-1">
            <h3 className="text-white font-bold text-base">QBR Builder Ready</h3>
            <p className="text-xs text-gray-500">Click &ldquo;Generate QBR&rdquo; above to audit telemetry and request Gemini to build the executive slide deck.</p>
          </div>
        </div>
      )}

      {/* QBR Report Output */}
      {report && !loading && (
        <div className="space-y-6 print-container">
          {/* Executive Summary Slide */}
          <div className="glass rounded-3xl border border-[rgba(255,255,255,0.06)] p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-[rgba(59,130,246,0.04)] via-transparent to-transparent">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#3B82F6] opacity-[0.02] blur-3xl pointer-events-none" />
            <p className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest mb-1.5">Executive Presentation</p>
            <h3 className="text-lg md:text-xl font-black text-white mb-4">1. Executive Overview</h3>
            <p className="text-sm text-gray-300 leading-relaxed font-medium">{report.executiveSummary}</p>
          </div>

          {/* Highlights & Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Achievements */}
            <div className="glass rounded-3xl border border-[rgba(74,222,128,0.12)] p-6 bg-gradient-to-br from-[rgba(74,222,128,0.03)] to-transparent">
              <h3 className="text-sm font-black text-[#4ADE80] uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Major Achievements
              </h3>
              <div className="space-y-4">
                {report.achievements.map((item, i) => (
                  <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4">
                    <p className="text-xs font-bold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="glass rounded-3xl border border-[rgba(249,115,22,0.12)] p-6 bg-gradient-to-br from-[rgba(249,115,22,0.03)] to-transparent">
              <h3 className="text-sm font-black text-[#F97316] uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Operational Risks & Focus Areas
              </h3>
              <div className="space-y-4">
                {report.operationalWeaknesses.map((item, i) => (
                  <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4">
                    <p className="text-xs font-bold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Budget Analysis Slide */}
          <div className="glass rounded-3xl border border-[rgba(255,255,255,0.06)] p-6">
            <h3 className="text-sm font-black text-[#A78BFA] uppercase tracking-widest mb-4">2. Financial & Budget Analysis</h3>
            
            {metrics && (
              <div className="overflow-x-auto mb-4 border border-[rgba(255,255,255,0.05)] rounded-xl">
                <table className="w-full border-collapse text-left text-xs text-gray-400">
                  <thead className="bg-[rgba(255,255,255,0.02)] text-gray-300 font-bold uppercase tracking-wider text-[9px] border-b border-[rgba(255,255,255,0.05)]">
                    <tr>
                      <th className="p-3">Department</th>
                      <th className="p-3 text-right">Est. Budgeted Cost</th>
                      <th className="p-3 text-right">Actual Cost</th>
                      <th className="p-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.05)] font-mono">
                    <tr>
                      <td className="p-3 font-sans font-semibold text-white">Maintenance Work Orders</td>
                      <td className="p-3 text-right">${metrics.maintEstCost.toLocaleString()}</td>
                      <td className="p-3 text-right">${metrics.maintActCost.toLocaleString()}</td>
                      <td className="p-3 text-right" style={{ color: metrics.maintActCost <= metrics.maintEstCost ? "#4ADE80" : "#EF4444" }}>
                        ${(metrics.maintEstCost - metrics.maintActCost).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans font-semibold text-white">Cleaning Assignments</td>
                      <td className="p-3 text-right">${metrics.cleaningEstCost.toLocaleString()}</td>
                      <td className="p-3 text-right">${metrics.cleaningActCost.toLocaleString()}</td>
                      <td className="p-3 text-right" style={{ color: metrics.cleaningActCost <= metrics.cleaningEstCost ? "#4ADE80" : "#EF4444" }}>
                        ${(metrics.cleaningEstCost - metrics.cleaningActCost).toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-[rgba(255,255,255,0.02)] font-bold text-white text-xs border-t border-[rgba(255,255,255,0.1)]">
                      <td className="p-3 font-sans">Total Operations Expenditures</td>
                      <td className="p-3 text-right">${(metrics.maintEstCost + metrics.cleaningEstCost).toLocaleString()}</td>
                      <td className="p-3 text-right">${(metrics.maintActCost + metrics.cleaningActCost).toLocaleString()}</td>
                      <td className="p-3 text-right" style={{ color: (metrics.maintActCost + metrics.cleaningActCost) <= (metrics.maintEstCost + metrics.cleaningEstCost) ? "#4ADE80" : "#EF4444" }}>
                        ${((metrics.maintEstCost + metrics.cleaningEstCost) - (metrics.maintActCost + metrics.cleaningActCost)).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-gray-300 leading-relaxed bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 font-medium">{report.financialAnalysis}</p>
          </div>

          {/* Action Plan Timeline */}
          <div className="glass rounded-3xl border border-[rgba(255,255,255,0.06)] p-6">
            <h3 className="text-sm font-black text-[#3B82F6] uppercase tracking-widest mb-6">3. Strategic Action Plan</h3>
            <div className="relative border-l border-[rgba(255,255,255,0.08)] ml-3 space-y-6">
              {report.actionPlan.map((item, i) => (
                <div key={i} className="relative pl-6">
                  {/* Timeline bullet */}
                  <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#3B82F6] border border-[#000] shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs font-bold text-white">{item.step}</p>
                      <span className="text-[9px] font-black uppercase bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)] px-2 py-0.5 rounded-lg">
                        {item.timeframe}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global print CSS styles */}
      <style>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .no-print, header, nav, aside, footer, .sidebar, .qbr-tab-header, button {
            display: none !important;
          }
          .print-container {
            display: block !important;
            background: #fff !important;
            color: #000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .glass {
            background: #fff !important;
            border: 1px solid #e4e4e7 !important;
            box-shadow: none !important;
            color: #000 !important;
            border-radius: 0 !important;
            page-break-inside: avoid;
            margin-bottom: 24px !important;
          }
          h2, h3 {
            color: #000 !important;
          }
          p, td, th, span {
            color: #27272a !important;
          }
          table {
            border: 1px solid #e4e4e7 !important;
          }
          tr {
            border-bottom: 1px solid #e4e4e7 !important;
          }
          th {
            background: #f4f4f5 !important;
            color: #000 !important;
          }
          .timeline-bullet {
            border-color: #3b82f6 !important;
          }
        }
      `}</style>
    </div>
  );
}
