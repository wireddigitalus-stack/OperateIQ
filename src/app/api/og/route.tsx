import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const W = 1200;
const H = 630;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") || "Vision LLC";
  const subtitle =
    searchParams.get("subtitle") ||
    "Commercial Real Estate · Bristol, TN/VA";
  const tag = searchParams.get("tag") || "Tri-Cities CRE Leader";
  const type = searchParams.get("type") || "default"; // property | geo | blog | default

  // Accent colour per type
  const accentHex =
    type === "blog"
      ? "#60A5FA"
      : type === "geo"
      ? "#4ADE80"
      : type === "property"
      ? "#FACC15"
      : "#4ADE80";

  const tagBg =
    type === "blog"
      ? "rgba(96,165,250,0.15)"
      : type === "geo"
      ? "rgba(74,222,128,0.15)"
      : type === "property"
      ? "rgba(250,204,21,0.15)"
      : "rgba(74,222,128,0.15)";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0D1117",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Background glow blobs ── */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentHex}18 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: -60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%)",
          }}
        />

        {/* ── Geometry: angled accent stripe ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 120,
            width: 6,
            height: H,
            backgroundColor: accentHex,
            opacity: 0.12,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 140,
            width: 2,
            height: H,
            backgroundColor: accentHex,
            opacity: 0.06,
          }}
        />

        {/* ── Left accent bar ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 8,
            height: H,
            background: `linear-gradient(to bottom, ${accentHex}, rgba(34,197,94,0.4))`,
          }}
        />

        {/* ── Top row: branding + tag ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "44px 64px 0 56px",
          }}
        >
          {/* Logo wordmark */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* Zap icon approximation */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, #4ADE80, #22C55E)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 20,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "20px solid #000",
                    position: "relative",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: "-0.5px",
                }}
              >
                VISION LLC
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: "#6B7280",
                marginTop: 4,
                marginLeft: 50,
              }}
            >
              Commercial Real Estate · Bristol, TN/VA
            </span>
          </div>

          {/* Type tag badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 10,
              backgroundColor: tagBg,
              border: `1.5px solid ${accentHex}55`,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: accentHex,
                marginRight: 8,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: accentHex,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {tag}
            </span>
          </div>
        </div>

        {/* ── Main content (title + subtitle) ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px 0 56px",
            flex: 1,
          }}
        >
          {/* Title — scales down if long */}
          <div
            style={{
              fontSize: title.length > 55 ? 52 : title.length > 40 ? 62 : 72,
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              marginBottom: 24,
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              color: "#9CA3AF",
              fontWeight: 500,
              lineHeight: 1.4,
              maxWidth: 780,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 64px 36px 56px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: accentHex,
                marginRight: 10,
              }}
            />
            <span style={{ fontSize: 15, color: "#6B7280" }}>
              teamvisionllc.com
            </span>
            <span style={{ fontSize: 15, color: "#374151", margin: "0 12px" }}>·</span>
            <span style={{ fontSize: 15, color: "#6B7280" }}>
              Largest private CRE owner in Downtown Bristol
            </span>
          </div>

          <span style={{ fontSize: 15, color: "#6B7280" }}>
            423-573-1022
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
    }
  );
}
