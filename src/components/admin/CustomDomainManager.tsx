"use client";

import React, { useState } from "react";
import {
  Globe, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Copy, ExternalLink, RefreshCw, Trash2, ShieldCheck, Sparkles, HelpCircle
} from "lucide-react";

interface CustomDomainManagerProps {
  orgId?: string;
  orgName?: string;
  currentDomain?: string | null;
  onDomainUpdated?: (domain: string | null) => void;
}

export default function CustomDomainManager({
  orgId,
  orgName = "WIRED DIGITAL LLC",
  currentDomain,
  onDomainUpdated,
}: CustomDomainManagerProps) {
  const [domainInput, setDomainInput] = useState(currentDomain || "");
  const [activeProvider, setActiveProvider] = useState<"godaddy" | "ionos">("godaddy");
  const [domainType, setDomainType] = useState<"subdomain" | "apex">("subdomain");
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    currentRecords?: string[];
  } | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainInput.trim()) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch("/api/platform/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domainInput.trim(),
          orgId: orgId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setVerificationResult({
          verified: data.verified,
          message: data.message,
          currentRecords: data.currentRecords,
        });
        if (onDomainUpdated) {
          onDomainUpdated(data.domain);
        }
      } else {
        setVerificationResult({
          verified: false,
          message: data.error || "Failed to verify domain.",
        });
      }
    } catch {
      setVerificationResult({
        verified: false,
        message: "DNS check network timeout. If you just saved records in GoDaddy or IONOS, allow a few minutes for propagation.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm(`Are you sure you want to disconnect custom domain ${currentDomain}?`)) return;

    setIsVerifying(true);
    try {
      await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orgId,
          custom_domain: null,
        }),
      });
      setDomainInput("");
      setVerificationResult(null);
      if (onDomainUpdated) onDomainUpdated(null);
    } catch (err) {
      console.error("Failed to remove custom domain", err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080C16] p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Globe size={18} />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Custom Domain Manager (GoDaddy & IONOS)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Connect your own branded domain to {orgName} so clients and tenants visit your website directly.
          </p>
        </div>

        {currentDomain && (
          <div className="flex items-center gap-2">
            <a
              href={`https://${currentDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-300 hover:bg-sky-500/20 text-xs font-bold transition-all"
            >
              <span>Visit {currentDomain}</span>
              <ExternalLink size={12} />
            </a>
            <button
              onClick={handleRemoveDomain}
              className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all text-xs"
              title="Disconnect Domain"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Input & Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Enter Your Domain Name
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. properties.wireddigital.com or wireddigitalproperties.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white text-sm outline-none focus:border-sky-400 transition-colors placeholder:text-slate-600 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !domainInput.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-bold text-sm shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all flex-shrink-0"
            >
              <RefreshCw
                size={14}
                className={isVerifying ? "animate-spin" : ""}
              />
              <span>{isVerifying ? "Verifying DNS..." : "Save & Verify DNS"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Tip: You can use a dedicated standalone domain (e.g. <span className="font-mono text-slate-400">wireddigitalproperties.com</span>) or a subdomain of your existing site (e.g. <span className="font-mono text-slate-400">properties.wireddigital.com</span>).
          </p>
        </div>
      </form>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            verificationResult.verified
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          {verificationResult.verified ? (
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Clock size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <p className="font-bold">{verificationResult.message}</p>
            {verificationResult.currentRecords && verificationResult.currentRecords.length > 0 && (
              <p className="text-[11px] font-mono text-slate-400">
                Resolved DNS: {verificationResult.currentRecords.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Domain Type Selection */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          1. Choose Your Domain Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDomainType("subdomain")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              domainType === "subdomain"
                ? "bg-sky-500/15 border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-white">Subdomain (Recommended)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                Easiest
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              e.g. <span className="font-mono text-sky-300">properties</span>.wireddigital.com
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDomainType("apex")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              domainType === "apex"
                ? "bg-sky-500/15 border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-white">Root / Apex Domain</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                Standalone
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              e.g. <span className="font-mono text-indigo-300">wireddigitalproperties.com</span>
            </p>
          </button>
        </div>
      </div>

      {/* DNS Configuration Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            2. Required DNS Records
          </label>
          <span className="text-[11px] text-slate-500">Add these in your registrar DNS panel</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/15 bg-black/40">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/[0.05] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Name / Host</th>
                <th className="px-4 py-2.5">Target / Value</th>
                <th className="px-4 py-2.5">TTL</th>
                <th className="px-4 py-2.5 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {domainType === "subdomain" ? (
                <tr>
                  <td className="px-4 py-3 font-bold text-sky-400">CNAME</td>
                  <td className="px-4 py-3 text-white">
                    {domainInput.split(".")[0] || "properties"}
                  </td>
                  <td className="px-4 py-3 text-emerald-300">cname.vercel-dns.com</td>
                  <td className="px-4 py-3 text-slate-400">1/2 Hour (1800)</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => copyToClipboard("cname.vercel-dns.com", "cname")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] transition-all"
                    >
                      <Copy size={11} />
                      <span>{copiedKey === "cname" ? "Copied!" : "Copy"}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td className="px-4 py-3 font-bold text-indigo-400">A</td>
                    <td className="px-4 py-3 text-white">@</td>
                    <td className="px-4 py-3 text-emerald-300">76.76.21.21</td>
                    <td className="px-4 py-3 text-slate-400">1/2 Hour (1800)</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => copyToClipboard("76.76.21.21", "a-record")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] transition-all"
                      >
                        <Copy size={11} />
                        <span>{copiedKey === "a-record" ? "Copied!" : "Copy"}</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-sky-400">CNAME</td>
                    <td className="px-4 py-3 text-white">www</td>
                    <td className="px-4 py-3 text-emerald-300">cname.vercel-dns.com</td>
                    <td className="px-4 py-3 text-slate-400">1/2 Hour (1800)</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => copyToClipboard("cname.vercel-dns.com", "cname-www")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] transition-all"
                      >
                        <Copy size={11} />
                        <span>{copiedKey === "cname-www" ? "Copied!" : "Copy"}</span>
                      </button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider-Specific Step-by-Step Instructions */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            3. Step-by-Step Registrar Guide
          </label>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveProvider("godaddy")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeProvider === "godaddy"
                  ? "bg-sky-500 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              GoDaddy
            </button>
            <button
              type="button"
              onClick={() => setActiveProvider("ionos")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeProvider === "ionos"
                  ? "bg-sky-500 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              IONOS
            </button>
          </div>
        </div>

        {activeProvider === "godaddy" ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>GoDaddy DNS Configuration Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 pl-1">
              <li>
                Sign in to your{" "}
                <a
                  href="https://dcc.godaddy.com/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline font-semibold"
                >
                  GoDaddy Domain Control Center
                </a>
                .
              </li>
              <li>
                In your domain list, click your domain name, then click{" "}
                <strong className="text-white">Manage DNS</strong> (or DNS tab).
              </li>
              {domainType === "subdomain" ? (
                <>
                  <li>
                    Click <strong className="text-white">Add New Record</strong>.
                  </li>
                  <li>
                    Select Type: <strong className="text-sky-300 font-mono">CNAME</strong>.
                  </li>
                  <li>
                    Name: <strong className="text-white font-mono">{domainInput.split(".")[0] || "properties"}</strong>.
                  </li>
                  <li>
                    Value: <strong className="text-emerald-400 font-mono">cname.vercel-dns.com</strong>.
                  </li>
                  <li>
                    TTL: <strong className="text-white">1/2 Hour</strong> (or Default) and click <strong className="text-white">Save</strong>.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Find the existing <strong className="text-white">A Record</strong> with Name <strong className="text-white">@</strong> and click Edit.
                  </li>
                  <li>
                    Set Value to <strong className="text-emerald-400 font-mono">76.76.21.21</strong> and Save.
                  </li>
                  <li>
                    Add or edit <strong className="text-sky-300 font-mono">CNAME</strong> with Name <strong className="text-white">www</strong> pointing to <strong className="text-emerald-400 font-mono">cname.vercel-dns.com</strong>.
                  </li>
                </>
              )}
              <li>
                Return here and click{" "}
                <strong className="text-sky-300">Save & Verify DNS</strong> above!
              </li>
            </ol>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>IONOS DNS Configuration Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 pl-1">
              <li>
                Sign in to the{" "}
                <a
                  href="https://my.ionos.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline font-semibold"
                >
                  IONOS Cloud Panel / Control Center
                </a>
                .
              </li>
              <li>
                Navigate to <strong className="text-white">Domains & SSL</strong>.
              </li>
              <li>
                Click the gear icon next to your domain and select <strong className="text-white">DNS</strong>.
              </li>
              {domainType === "subdomain" ? (
                <>
                  <li>
                    Click <strong className="text-white">Add record</strong> and select <strong className="text-sky-300 font-mono">CNAME</strong>.
                  </li>
                  <li>
                    Host name: <strong className="text-white font-mono">{domainInput.split(".")[0] || "properties"}</strong>.
                  </li>
                  <li>
                    Points to: <strong className="text-emerald-400 font-mono">cname.vercel-dns.com</strong>.
                  </li>
                  <li>
                    Click <strong className="text-white">Save</strong>.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    In the DNS records list, click the <strong className="text-white">A Record</strong> with Host Name <strong className="text-white">@</strong>.
                  </li>
                  <li>
                    Click Edit, set Points to IP: <strong className="text-emerald-400 font-mono">76.76.21.21</strong>, and Save.
                  </li>
                  <li>
                    Ensure <strong className="text-white">www</strong> CNAME points to <strong className="text-emerald-400 font-mono">cname.vercel-dns.com</strong>.
                  </li>
                </>
              )}
              <li>
                Click <strong className="text-sky-300">Save & Verify DNS</strong> above to complete the setup!
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
