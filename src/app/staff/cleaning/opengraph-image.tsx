import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "radial-gradient(circle at center, #0B2B0B 0%, #041204 80%, #010401 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 60px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fff",
        }}
      >
        {/* Inner border / frame */}
        <div
          style={{
            position: "absolute",
            top: 30,
            bottom: 30,
            left: 30,
            right: 30,
            border: "1px solid rgba(16, 185, 129, 0.15)",
            borderRadius: 24,
            pointerEvents: "none",
          }}
        />

        {/* Upper decorative element - Category / Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            padding: "8px 16px",
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "2px",
            color: "#34D399",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          <span>Team Vision Portal</span>
        </div>

        {/* Main Icon Area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 40,
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            boxShadow: "0 20px 40px rgba(5, 150, 105, 0.3)",
            fontSize: 70,
            marginBottom: 32,
          }}
        >
          🧹
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 12,
            letterSpacing: "-1px",
          }}
        >
          Cleaning Portal
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#A7F3D0",
            textAlign: "center",
            maxWidth: 600,
            opacity: 0.8,
            fontWeight: 400,
            marginBottom: 40,
          }}
        >
          Environmental Services, Inspections & Facility Management
        </div>

        {/* Brand Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 18,
            fontWeight: 500,
            color: "#9CA3AF",
            letterSpacing: "1px",
          }}
        >
          <span>VISION</span>
          <span style={{ color: "#4B5563" }}>|</span>
          <span>STAFF DIRECTORY</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
