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
          background: "radial-gradient(circle at center, #2B1E03 0%, #120C01 80%, #050300 100%)",
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
            border: "1px solid rgba(245, 158, 11, 0.15)",
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
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            padding: "8px 16px",
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "2px",
            color: "#FBBF24",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          <span>PropOpsIQ Portal</span>
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
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            boxShadow: "0 20px 40px rgba(217, 119, 6, 0.3)",
            fontSize: 70,
            marginBottom: 32,
          }}
        >
          🔧
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
          Maintenance Portal
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#FDE68A",
            textAlign: "center",
            maxWidth: 600,
            opacity: 0.8,
            fontWeight: 400,
            marginBottom: 40,
          }}
        >
          Facility Operations, Work Orders & Property Maintenance
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
          <span>PropOpsIQ</span>
          <span style={{ color: "#4B5563" }}>|</span>
          <span>STAFF DIRECTORY</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
