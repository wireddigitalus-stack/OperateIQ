"use client";
import { Printer } from "lucide-react";

interface Props {
  /** id of the container element whose content will be printed */
  zoneId?: string;
  /** Optional: supply raw HTML string directly instead of reading from DOM */
  buildHTML?: () => string;
  label?: string;
  title?: string;
}

const PRINT_CSS = `
  @page { margin: 18mm 15mm; }
  *, *::before, *::after {
    color: #000 !important;
    background: #fff !important;
    background-color: #fff !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    border-color: #ccc !important;
    opacity: 1 !important;
    -webkit-print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    padding: 0;
    margin: 0;
  }
  /* Page header */
  .print-page-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 10px;
    margin-bottom: 16px;
    border-bottom: 2px solid #000 !important;
  }
  .print-page-header h1 { font-size: 16pt; font-weight: 900; margin: 0; }
  .print-page-header span { font-size: 9pt; color: #555 !important; }
  /* Cards become simple bordered boxes */
  [id^="ticket-card-"], .glass, [class*="rounded-2xl"], [class*="rounded-xl"] {
    border: 1px solid #ccc !important;
    border-radius: 0 !important;
    padding: 8px 10px !important;
    margin-bottom: 8px !important;
    page-break-inside: avoid;
  }
  /* Hide interactive / decorative elements */
  button, [class*="animate-"], [class*="blur"],
  [class*="opacity-0"], [class*="group-hover"],
  [class*="pointer-events"], [class*="absolute"],
  [data-no-print], .no-print { display: none !important; }
  /* Make all text visible */
  h1, h2, h3, h4, p, span, div, li, td, th {
    color: #000 !important;
    text-decoration: none;
  }
  /* Ensure text doesn't disappear due to tiny font */
  [class*="text-\\[10px\\]"], [class*="text-\\[9px\\]"],
  [class*="text-xs"] { font-size: 8.5pt !important; }
  [class*="text-sm"] { font-size: 9.5pt !important; }
  [class*="text-base"], [class*="text-lg"] { font-size: 11pt !important; }
  [class*="text-xl"], [class*="text-2xl"], [class*="text-3xl"] { font-size: 13pt !important; }
  /* Emoji score badges, labels — keep them */
  [class*="tabular-nums"] { font-family: monospace; }
  /* Grid layouts — collapse to single column for readability */
  [class*="grid"] { display: block !important; }
  [class*="flex"] { display: block !important; }
  [class*="flex-wrap"] { display: block !important; }
  /* Re-enable flex only for header rows */
  .print-page-header { display: flex !important; }
  /* Phone / email links — show the actual value */
  a[href^="tel"]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #555 !important; }
  a[href^="mailto"]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #555 !important; }
  /* Tables */
  table { width: 100% !important; border-collapse: collapse !important; }
  th, td { border: 1px solid #bbb !important; padding: 5px 8px !important; }
  th { background: #f0f0f0 !important; font-weight: 700 !important; }
`;

export default function PrintButton({ zoneId, buildHTML, label = "Print / PDF", title }: Props) {
  const handlePrint = () => {
    let bodyHTML = "";

    if (buildHTML) {
      bodyHTML = buildHTML();
    } else if (zoneId) {
      const zone = document.getElementById(zoneId);
      if (!zone) {
        alert("Nothing to print yet — data may still be loading.");
        return;
      }
      // Clone so we don't mutate the live DOM
      const clone = zone.cloneNode(true) as HTMLElement;
      // Remove elements that should never print (buttons, icons that are purely decorative)
      clone.querySelectorAll("button, svg[class*='lucide'], [data-no-print], .no-print").forEach(el => el.remove());
      bodyHTML = clone.innerHTML;
    }

    if (!bodyHTML.trim()) {
      alert("Nothing to print — the list appears to be empty.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const win = window.open("", "_blank", "width=900,height=750,scrollbars=yes");
    if (!win) {
      alert("Pop-up blocked — please allow pop-ups for this site and try again.");
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title ?? "Vision Report"}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="print-page-header">
    <h1>${title ?? "Vision Report"}</h1>
    <span>${dateStr} &nbsp;·&nbsp; Vision LLC</span>
  </div>
  ${bodyHTML}
</body>
</html>`);

    win.document.close();

    // Give images / fonts a moment to load before printing
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        // win.close() — leave open so user can Save as PDF if they need
      }, 300);
    };

    // Fallback if onload doesn't fire (e.g. Firefox)
    setTimeout(() => {
      if (!win.closed) {
        win.focus();
        win.print();
      }
    }, 800);
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.25)] text-xs font-bold transition-all"
      title="Print or Save as PDF"
    >
      <Printer size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
