"use client";
import React, { useState } from "react";
import { FileText, Printer, Building2, MapPin, Ruler, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { PROPERTIES, COMPANY } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Property = (typeof PROPERTIES)[number];

// ─── Image → base64 helper ───────────────────────────────────────────────────
async function toDataUri(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// ─── Logo → base64 helper ────────────────────────────────────────────────────
async function toLogoDataUri(baseUrl: string): Promise<string> {
  return toDataUri(`${baseUrl}/vision-logo.png`);
}

// ─── One-Sheet HTML Builder ───────────────────────────────────────────────────

function buildOneSheetHTML(
  property: Property,
  baseUrl: string,
  imageDataUri: string = "",
  logoDataUri: string = ""
): string {
  const features = (property.features ?? []);
  const half = Math.ceil(features.length / 2);
  const col1 = features.slice(0, half);
  const col2 = features.slice(half);

  const featRow = (f: string) =>
    `<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
       <div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#4ade80,#22c55e);display:flex;align-items:center;justify-content:center;flex-shrink:0">
         <span style="color:#000;font-size:8px;font-weight:900;line-height:1">✓</span>
       </div>
       <span style="font-size:9.5pt;color:#e2e8f0;line-height:1.3">${f}</span>
     </div>`;

  const imageUrl =
    imageDataUri ||
    ((property as Property & { image?: string }).image
      ? `${baseUrl}${(property as Property & { image?: string }).image}`
      : null);

  const logoSrc = logoDataUri || `${baseUrl}/vision-logo.png`;

  const heroBlock = imageUrl
    ? `<div style="position:absolute;inset:0">
         <img src="${imageUrl}" alt="${property.imageAlt ?? property.name}"
           style="width:100%;height:100%;object-fit:cover;display:block" />
         <div style="position:absolute;inset:0;background:linear-gradient(
           180deg,
           rgba(5,10,18,0.55) 0%,
           rgba(5,10,18,0.20) 40%,
           rgba(5,10,18,0.75) 100%
         )"></div>
       </div>`
    : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#0f1f3a 0%,#071126 100%)">
         <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:80px;opacity:.06">🏢</div>
       </div>`;

  const badge = (property as Property & { badge?: string }).badge ?? property.type;
  const address = (property as Property & { address?: string }).address ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${property.name} — Vision LLC</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { margin: 0; size: letter portrait; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #050a12;
      color: #f1f5f9;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .page {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #050a12;
    }

    /* ── Hero ── */
    .hero {
      position: relative;
      height: 220px;
      flex-shrink: 0;
      overflow: hidden;
    }

    /* Top nav bar over hero */
    .top-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px;
      background: linear-gradient(180deg, rgba(5,10,18,0.90) 0%, transparent 100%);
    }
    .logo-img {
      height: 28px;
      width: auto;
      object-fit: contain;
      filter: brightness(0) invert(1);
      opacity: .92;
    }
    .top-bar-contact {
      text-align: right;
    }
    .top-bar-contact p {
      font-size: 7.5pt;
      color: rgba(255,255,255,0.65);
      line-height: 1.6;
    }
    .top-bar-contact a {
      color: #4ade80;
      text-decoration: none;
      font-weight: 700;
    }

    /* Property info overlay at bottom of hero */
    .hero-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      z-index: 10;
      padding: 0 28px 16px;
    }
    .prop-type-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      color: #000;
      font-size: 7pt;
      font-weight: 900;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      padding: 3px 11px;
      border-radius: 20px;
      margin-bottom: 6px;
    }
    .prop-name {
      font-size: 24pt;
      font-weight: 900;
      color: #fff;
      line-height: 1.05;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 20px rgba(0,0,0,0.5);
      margin-bottom: 6px;
    }
    .prop-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .meta-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      color: rgba(255,255,255,0.75);
    }
    .status-chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      background: rgba(74,222,128,0.18);
      border: 1px solid rgba(74,222,128,0.45);
      color: #4ade80;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: .5px;
    }

    /* ── Gold accent line ── */
    .accent-bar {
      height: 3px;
      background: linear-gradient(90deg, #4ade80 0%, #22c55e 35%, #4ade80 70%, #86efac 100%);
      flex-shrink: 0;
    }

    /* ── Body ── */
    .body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    /* Left column */
    .left-col {
      width: 57%;
      padding: 18px 20px 18px 28px;
      border-right: 1px solid rgba(255,255,255,0.07);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Right column */
    .right-col {
      width: 43%;
      padding: 18px 28px 18px 20px;
      background: rgba(255,255,255,0.02);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-label {
      font-size: 6.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #4ade80;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(74,222,128,0.2);
      margin-bottom: 2px;
    }

    .description {
      font-size: 9.5pt;
      line-height: 1.65;
      color: #94a3b8;
    }

    /* ── Specs grid ── */
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .spec-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      padding: 8px 11px;
    }
    .spec-label {
      font-size: 6.5pt;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .spec-value {
      font-size: 9.5pt;
      font-weight: 800;
      color: #f1f5f9;
    }

    /* ── Features ── */
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 12px;
    }

    /* ── Image strip (2nd look, alternate crop) ── */
    .image-strip {
      position: relative;
      height: 88px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .image-strip img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 80%;
      display: block;
    }
    .image-strip-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(5,10,18,0.65) 0%, rgba(5,10,18,0.1) 60%);
    }
    .image-strip-caption {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 7.5pt;
      font-weight: 800;
      color: rgba(255,255,255,0.75);
      letter-spacing: .8px;
      text-transform: uppercase;
    }
    .image-strip-caption span {
      color: #4ade80;
    }

    /* ── Trust block ── */
    .trust-block {
      background: linear-gradient(135deg, #0a1628 0%, #060e1d 100%);
      border: 1px solid rgba(74,222,128,0.15);
      border-radius: 10px;
      padding: 12px 14px;
      flex-shrink: 0;
    }
    .trust-label {
      font-size: 6pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #4ade80;
      margin-bottom: 9px;
    }
    .trust-pillars {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 9px;
    }
    .trust-pillar {
      text-align: center;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 8px 6px;
    }
    .trust-pillar-icon {
      font-size: 14px;
      margin-bottom: 4px;
      display: block;
    }
    .trust-pillar-title {
      font-size: 8pt;
      font-weight: 900;
      color: #f1f5f9;
      line-height: 1.2;
      margin-bottom: 2px;
    }
    .trust-pillar-sub {
      font-size: 6.5pt;
      color: #475569;
      line-height: 1.3;
    }
    .trust-tagline {
      font-size: 8pt;
      color: #475569;
      font-style: italic;
      text-align: center;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 8px;
    }
    .trust-tagline strong {
      color: #4ade80;
      font-style: normal;
    }

    /* ── Spacer pushes filler to the bottom ── */
    .left-spacer { flex: 1; min-height: 0; }

    /* ── CTA box ── */
    .cta-box {
      background: linear-gradient(135deg, #0d1f3a 0%, #071222 100%);
      border: 1px solid rgba(74,222,128,0.25);
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: auto;
    }
    .cta-title {
      font-size: 11pt;
      font-weight: 900;
      color: #fff;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(74,222,128,0.15);
    }
    .cta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .cta-icon-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(74,222,128,0.1);
      border: 1px solid rgba(74,222,128,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }
    .cta-label { font-size: 8pt; color: #64748b; }
    .cta-value { font-size: 9pt; color: #4ade80; font-weight: 800; }
    .cta-tagline {
      margin-top: 10px;
      padding-top: 9px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 8pt;
      color: #475569;
      line-height: 1.5;
      font-style: italic;
    }

    /* ── Footer ── */
    .footer {
      padding: 9px 28px;
      background: #02060d;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .footer-left { display: flex; align-items: center; gap: 10px; }
    .footer-logo {
      height: 18px;
      width: auto;
      object-fit: contain;
      filter: brightness(0) invert(1);
      opacity: .45;
    }
    .footer-divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.12);
    }
    .footer-meta { font-size: 7pt; color: #334155; }
    .footer-right { font-size: 6.5pt; color: #334155; text-align: right; max-width: 50%; line-height: 1.5; }
    .footer-green { color: #4ade80; font-weight: 700; }

    @media print {
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page, .hero, .top-bar, .accent-bar, .cta-box, .footer, .prop-type-pill {
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Hero image block -->
    <div class="hero">
      ${heroBlock}

      <!-- Top nav -->
      <div class="top-bar">
        <img class="logo-img" src="${logoSrc}" alt="Vision LLC" />
        <div class="top-bar-contact">
          <p><a href="tel:${COMPANY.phoneHref}">${COMPANY.phone}</a></p>
          <p><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></p>
        </div>
      </div>

      <!-- Property identity overlay -->
      <div class="hero-overlay">
        <div class="prop-type-pill">${badge}</div>
        <div class="prop-name">${property.name}</div>
        <div class="prop-meta">
          ${address ? `<div class="meta-chip">📍 ${address}</div>` : `<div class="meta-chip">📍 ${property.city}</div>`}
          <div class="meta-chip">📐 ${property.sqft} sqft</div>
          <span class="status-chip">● ${property.status}</span>
        </div>
      </div>
    </div>

    <!-- Green accent line -->
    <div class="accent-bar"></div>

    <!-- Body -->
    <div class="body">

      <!-- LEFT: description + features -->
      <div class="left-col">

        <div>
          <div class="section-label">About This Property</div>
          <p class="description">${property.description}</p>
        </div>

        ${
          features.length > 0
            ? `<div>
                <div class="section-label">Features &amp; Amenities</div>
                <div class="features-grid">
                  <div>${col1.map(featRow).join("")}</div>
                  <div>${col2.map(featRow).join("")}</div>
                </div>
               </div>`
            : ""
        }

        <!-- Spacer: pushes image strip + trust block to the bottom -->
        <div class="left-spacer"></div>

        <!-- Image strip: same photo, alternate crop (bottom of building) -->
        ${
          imageUrl
            ? `<div class="image-strip">
                 <img src="${imageUrl}" alt="${property.imageAlt ?? property.name} — detail view" />
                 <div class="image-strip-overlay"></div>
                 <div class="image-strip-caption">Property Detail · <span>${property.city}</span></div>
               </div>`
            : ""
        }

        <!-- Vision LLC Brand Trust Block -->
        <div class="trust-block">
          <div class="trust-label">Why Vision LLC</div>
          <div class="trust-pillars">
            <div class="trust-pillar">
              <span class="trust-pillar-icon">🏆</span>
              <div class="trust-pillar-title">20+ Years</div>
              <div class="trust-pillar-sub">Serving Bristol's commercial market</div>
            </div>
            <div class="trust-pillar">
              <span class="trust-pillar-icon">🤝</span>
              <div class="trust-pillar-title">Personal Service</div>
              <div class="trust-pillar-sub">Every prospect gets a personal walk-through</div>
            </div>
            <div class="trust-pillar">
              <span class="trust-pillar-icon">📍</span>
              <div class="trust-pillar-title">Downtown's #1</div>
              <div class="trust-pillar-sub">Largest commercial portfolio in Bristol, TN/VA</div>
            </div>
          </div>
          <div class="trust-tagline"><strong>Vision LLC</strong> — where every deal is personal.</div>
        </div>

      </div>

      <!-- RIGHT: specs + CTA -->
      <div class="right-col">

        <div>
          <div class="section-label">Property Specs</div>
          <div class="specs-grid">
            <div class="spec-card">
              <div class="spec-label">Type</div>
              <div class="spec-value">${property.type}</div>
            </div>
            <div class="spec-card">
              <div class="spec-label">Total Space</div>
              <div class="spec-value">${property.sqft} sqft</div>
            </div>
            <div class="spec-card">
              <div class="spec-label">Market</div>
              <div class="spec-value">${property.city}</div>
            </div>
            <div class="spec-card">
              <div class="spec-label">Status</div>
              <div class="spec-value" style="color:#4ade80">${property.status}</div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-box">
          <div class="cta-title">Schedule a Showing</div>

          <div class="cta-row">
            <div class="cta-icon-dot">📞</div>
            <div>
              <div class="cta-label">Direct Line</div>
              <div class="cta-value">${COMPANY.phone}</div>
            </div>
          </div>

          <div class="cta-row">
            <div class="cta-icon-dot">✉</div>
            <div>
              <div class="cta-label">Email</div>
              <div class="cta-value">${COMPANY.email}</div>
            </div>
          </div>

          <div class="cta-row">
            <div class="cta-icon-dot">🌐</div>
            <div>
              <div class="cta-label">Website</div>
              <div class="cta-value">teamvisionllc.com</div>
            </div>
          </div>

          <p class="cta-tagline">
            Vision LLC — Downtown Bristol's premier commercial property owner.
            Our team personally walks every prospect through available spaces.
          </p>
        </div>

      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <img class="footer-logo" src="${logoSrc}" alt="Vision LLC" />
        <div class="footer-divider"></div>
        <span class="footer-meta">${COMPANY.fullAddress} · ${COMPANY.phone}</span>
      </div>
      <div class="footer-right">
        Information subject to change without notice. All square footages approximate.<br/>
        Contact Vision LLC to confirm availability &amp; lease terms.<br/>
        <span class="footer-green">teamvisionllc.com</span> · Generated ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PropertyOneSheet() {
  const [selected, setSelected] = useState<Property | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const handleGenerate = async () => {
    if (!selected) return;
    setPreviewing(true);

    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "https://www.teamvisionllc.com";

    const imgPath = (selected as Property & { image?: string }).image;
    const [imageDataUri, logoDataUri] = await Promise.all([
      imgPath ? toDataUri(`${baseUrl}${imgPath}`) : Promise.resolve(""),
      toLogoDataUri(baseUrl),
    ]);

    const html = buildOneSheetHTML(selected, baseUrl, imageDataUri, logoDataUri);

    const win = window.open("", "_blank", "width=940,height=800,scrollbars=yes");
    if (!win) {
      alert("Pop-up blocked — please allow pop-ups for this site and try again.");
      setPreviewing(false);
      return;
    }

    win.document.write(html);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        setPreviewing(false);
      }, 900);
    };

    setTimeout(() => {
      if (!win.closed) {
        win.focus();
        win.print();
      }
      setPreviewing(false);
    }, 1600);
  };

  return (
    <div className="mt-6 max-w-4xl">
      {/* Header */}
      <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-gradient-to-br from-[rgba(74,222,128,0.05)] via-transparent to-transparent p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#4ADE80] opacity-[0.03] blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-[0_0_14px_rgba(74,222,128,0.3)]">
            <FileText size={18} className="text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">Property One-Sheet Generator</h2>
              <span className="flex items-center gap-1 text-[9px] font-black text-[#4ADE80] bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] px-2 py-0.5 rounded-full uppercase tracking-widest">
                <Sparkles size={8} /> Premium PDF
              </span>
            </div>
            <p className="text-xs text-gray-500">Generate a branded, print-ready PDF for any Vision property</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3 leading-relaxed">
          Select a property below and click <strong className="text-gray-400">Generate One-Sheet</strong> — a
          magazine-quality brochure opens in a new window. Use your browser&apos;s&nbsp;
          <strong className="text-gray-400">Save as PDF</strong> option or print directly.
          Great for showings, email attachments, and listing folders.
        </p>
      </div>

      {/* Property grid */}
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
        Select a Property
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {PROPERTIES.map((p) => {
          const isSelected = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`text-left rounded-xl border p-4 transition-all group ${
                isSelected
                  ? "border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.07)] shadow-[0_0_16px_rgba(74,222,128,0.08)]"
                  : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              {/* Property image thumbnail */}
              <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-[rgba(255,255,255,0.04)] relative">
                {(p as Property & { image?: string }).image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(p as Property & { image?: string }).image}
                    alt={p.imageAlt ?? p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-700">🏢</div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-[rgba(74,222,128,0.15)] flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-[#4ADE80] drop-shadow-lg" />
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={`text-sm font-bold leading-tight ${isSelected ? "text-[#4ADE80]" : "text-white"}`}>
                  {p.name}
                </p>
                {isSelected && <CheckCircle2 size={14} className="text-[#4ADE80] flex-shrink-0 mt-0.5" />}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-gray-600 mb-1">
                <Building2 size={9} />
                <span>{p.type}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-600 mb-1">
                <MapPin size={9} />
                <span>{p.city}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <Ruler size={9} />
                <span>{p.sqft} sqft</span>
              </div>

              <div
                className={`mt-2 inline-block text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  p.status.toLowerCase().includes("available")
                    ? "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] border border-[rgba(74,222,128,0.2)]"
                    : "bg-[rgba(250,204,21,0.08)] text-[#FACC15] border border-[rgba(250,204,21,0.15)]"
                }`}
              >
                {p.status}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected property preview + generate button */}
      {selected ? (
        <div className="rounded-2xl border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.04)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Ready to generate:</p>
            <p className="text-base font-black text-white">{selected.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected.type} · {selected.city} · {selected.sqft} sqft
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={previewing}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black hover:opacity-90 disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(74,222,128,0.25)] flex-shrink-0"
          >
            <Printer size={15} />
            {previewing ? "Building PDF…" : "Generate One-Sheet PDF"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] p-6 flex items-center justify-center gap-3 text-gray-600">
          <ChevronDown size={14} className="animate-bounce" />
          <p className="text-sm">Select a property above to generate its one-sheet</p>
        </div>
      )}
    </div>
  );
}
