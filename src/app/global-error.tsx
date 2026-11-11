"use client";

import React, { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: error?.name || "GlobalError",
        message: error?.message || "Root layout error",
        stack: error?.stack?.slice(0, 4000),
        digest: error?.digest,
        url: typeof window !== "undefined" ? window.location.href : "",
        boundary: "global-error",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.errorId) setErrorId(d.errorId);
      })
      .catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#070B14",
          color: "#F8FAFC",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "#0E1526",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 10px" }}>
            PropOpsIQ encountered an unexpected error
          </h1>
          <p style={{ fontSize: "14px", color: "#94A3B8", lineHeight: 1.6, margin: "0 0 16px" }}>
            Your portfolio data is safe. Please reload the page or contact support if this persists.
          </p>
          {(errorId || error.digest) && (
            <p
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#CBD5E1",
                background: "rgba(255,255,255,0.05)",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "inline-block",
                margin: "0 0 20px",
              }}
            >
              Reference: {errorId || error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#38BDF8",
                color: "#020617",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Reload Application
            </button>
            <a
              href="/help"
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#E2E8F0",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Contact Support
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
