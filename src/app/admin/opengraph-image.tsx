import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VISION | Admin Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #040812 0%, #0A1628 50%, #0D1B2A 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(74,222,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* Glow orb behind shield */}
        <div
          style={{
            position: "absolute",
            left: "220px",
            top: "160px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "80px",
            padding: "0 100px",
          }}
        >
          {/* Shield Icon */}
          <div
            style={{
              width: "180px",
              height: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="160"
              height="160"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ADE80"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" stroke="#4ADE80" strokeWidth="2" />
            </svg>
          </div>

          {/* Text */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                fontSize: "72px",
                fontWeight: 900,
                color: "white",
                letterSpacing: "-2px",
                lineHeight: 1,
                display: "flex",
              }}
            >
              VISION
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "1px",
                display: "flex",
              }}
            >
              Property Intelligence Platform
            </div>
          </div>
        </div>

        {/* Admin badge bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "48px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            borderRadius: "12px",
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.2)",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4ADE80",
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#4ADE80",
              letterSpacing: "2px",
              display: "flex",
            }}
          >
            ADMIN DASHBOARD
          </span>
        </div>

        {/* Branding bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            right: "48px",
            fontSize: "13px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "1px",
            display: "flex",
          }}
        >
          teamvisionllc.com
        </div>
      </div>
    ),
    { ...size }
  );
}
